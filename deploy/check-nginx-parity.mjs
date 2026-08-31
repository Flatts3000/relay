/**
 * Checks that the two nginx configs still agree about security behavior.
 *
 * There are two, and they must not drift:
 *
 *   frontend/nginx.conf      baked into the image; what the root
 *                            docker-compose.yml runs, with no bind mount
 *   deploy/nginx.prod.conf   bind-mounted over it in production
 *
 * The second copy never serves a real visitor, which is exactly why it rots.
 * This has already happened twice. Commit f01ac7e exists because an access-log
 * privacy fix landed in one and not the other, and the review of #78 caught the
 * same pattern again with absolute_redirect. Each time, the symptom only appears
 * if the production mount is ever dropped, so nothing catches it in normal use.
 *
 * Rather than diff the files, which differ legitimately (the image config
 * proxies /api to the backend service; the production one does not, because
 * Caddy routes that), this compares the directives whose absence would silently
 * weaken the deployment.
 *
 *   node deploy/check-nginx-parity.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMAGE = path.join(ROOT, 'frontend', 'nginx.conf');
const PROD = path.join(ROOT, 'deploy', 'nginx.prod.conf');

/**
 * Each entry is a directive that must be present in both files, and the reason,
 * so a failure explains itself rather than just naming a missing string.
 */
const REQUIRED = [
  [
    'absolute_redirect off',
    'Without it, /for-groups redirects to http://relayfunds.org/for-groups/, ' +
      'downgrading the scheme behind Caddy and costing a hop back through the HTTPS redirect.',
  ],
  [
    'Content-Security-Policy',
    'The document is the only place a CSP does anything. helmet sets one, but only on /api responses.',
  ],
  [
    'Permissions-Policy',
    'Disables camera, microphone, geolocation and payment APIs the app never uses.',
  ],
  [
    'log_format privacy',
    "nginx's stock log format records the visitor's address and user agent, which CLAUDE.md rules out.",
  ],
  [
    'X-Robots-Tag',
    '/deck is public but must stay out of search results.',
  ],
  [
    'try_files $uri =404',
    'Without it every nonexistent path returns 200 with the app shell, so the site has no real 404.',
  ],
];

const files = [
  ['frontend/nginx.conf', fs.readFileSync(IMAGE, 'utf8')],
  ['deploy/nginx.prod.conf', fs.readFileSync(PROD, 'utf8')],
];

const problems = [];
for (const [directive, why] of REQUIRED) {
  for (const [name, body] of files) {
    if (!body.includes(directive)) problems.push(`${name} is missing "${directive}".\n      ${why}`);
  }
}

// The CSP itself has to match, not merely be present in both. Two different
// policies is its own kind of drift, and the weaker one wins wherever it is
// served from.
const policies = files.map(([name, body]) => {
  const m = body.match(/add_header Content-Security-Policy\s+"([^"]+)"/);
  return [name, m?.[1] ?? null];
});
const [[, a], [, b]] = policies;
if (a && b && a !== b) {
  problems.push(
    'The two Content-Security-Policy values differ. They must be identical, or ' +
      'the policy depends on which config happens to be mounted:\n' +
      `      image: ${a}\n      prod : ${b}`
  );
}

if (problems.length > 0) {
  console.error('The two nginx configs disagree:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nBoth files must carry the same security behavior. Production bind-mounts\n' +
      'deploy/nginx.prod.conf over frontend/nginx.conf, so the second copy never\n' +
      'serves a visitor - and the protection vanishes silently if that mount is\n' +
      'ever dropped. This has happened twice already.\n'
  );
  process.exit(1);
}

console.log(`nginx configs agree on all ${REQUIRED.length} security directives, and on the CSP value.`);
