# Known Issues

Known issues are tracked as [GitHub issues](https://github.com/Flatts3000/relay/issues), not in this file. This document exists to point there and to record the state of the project as of the last full review.

**Last reviewed:** 2026-08-28

## Current state

Development has been paused since February 2026. A deployment exists at relayfunds.org but its API returns errors on every route except the health check, so the application is not usable. The database contains no pilot or user data.

## Open issue areas

| Area                             | Issues                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production outage and operations | [#1](https://github.com/Flatts3000/relay/issues/1) API returning 502, [#2](https://github.com/Flatts3000/relay/issues/2) no monitoring, [#10](https://github.com/Flatts3000/relay/issues/10) backups never restore-tested                                                                                     |
| Security                         | [#3](https://github.com/Flatts3000/relay/issues/3) dependency advisories, [#4](https://github.com/Flatts3000/relay/issues/4) unpatched host, [#11](https://github.com/Flatts3000/relay/issues/11) long-lived IAM key, [#15](https://github.com/Flatts3000/relay/issues/15) superseded mailbox path still live |
| Verification                     | [#5](https://github.com/Flatts3000/relay/issues/5) CI disabled, [#6](https://github.com/Flatts3000/relay/issues/6) test coverage                                                                                                                                                                              |
| Architecture and documentation   | [#7](https://github.com/Flatts3000/relay/issues/7) Terraform does not match deployment, [#8](https://github.com/Flatts3000/relay/issues/8) docs corrected, [#9](https://github.com/Flatts3000/relay/issues/9) stale MVP plan                                                                                  |
| Compliance and measurement       | [#12](https://github.com/Flatts3000/relay/issues/12) GDPR and COPPA, [#13](https://github.com/Flatts3000/relay/issues/13) success metrics                                                                                                                                                                     |
| Security review record           | [#14](https://github.com/Flatts3000/relay/issues/14) record the independent cryptography review                                                                                                                                                                                                               |

## Previously tracked here

The two items this file used to carry are now [#12](https://github.com/Flatts3000/relay/issues/12) (GDPR and COPPA evaluation) and [#13](https://github.com/Flatts3000/relay/issues/13) (aggregate success metrics). Both are still open. The earlier text referred to the "anonymous mailbox feature," which the encrypted broadcast model replaced. See [#15](https://github.com/Flatts3000/relay/issues/15) for the state of that migration, which was never completed.
