import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faLock,
  faArrowRight,
  faXmark,
  faHandHoldingHeart,
  faBuilding,
  faShieldHalved,
  faEnvelope,
  faLocationDot,
  faComments,
  faHandshake,
  faEyeSlash,
  faLightbulb,
  faBuildingColumns,
  faUsers,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import {
  Button,
  Input,
  Alert,
  Badge,
  Divider,
  Container,
  IconCircle,
  CheckboxGroup,
} from '../components/ui';

const SECTIONS = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'borders', label: 'Borders & Radius' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'components', label: 'Components' },
  { id: 'icons', label: 'Icons' },
  { id: 'layout', label: 'Layout' },
];

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 mb-8 pt-12 first:pt-0">
      <h2 className="text-3xl font-bold text-gray-900 font-heading mb-2">{title}</h2>
      <p className="text-gray-500 text-lg">{description}</p>
      <div className="h-px bg-gray-200 mt-6" />
    </div>
  );
}

function ColorSwatch({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 rounded-lg shadow-sm ${className}`} />
      <span className="text-xs font-medium text-gray-700">{name}</span>
      <span className="text-xs text-gray-400 font-mono">{hex}</span>
    </div>
  );
}

function SubHeading({ children }: { children: string }) {
  return <h3 className="text-xl font-semibold text-gray-800 font-heading mb-4 mt-8">{children}</h3>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto mb-6">
      <code>{children}</code>
    </pre>
  );
}

export function DesignSystemPage() {
  const [inputValue, setInputValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState<string[]>(['rent']);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-body">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center">
                <img src="/logo.png" alt="Relay" className="h-7" />
              </Link>
              <span className="text-sm text-gray-400 font-medium">/ Design System</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Intro */}
        <div className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 font-heading mb-4">
            Relay Design System
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl">
            Tokens, components, and patterns for building consistent, accessible, and trustworthy
            interfaces. This page is living documentation — every element is rendered live.
          </p>
        </div>

        {/* ================================================================ */}
        {/* COLORS */}
        {/* ================================================================ */}
        <SectionHeading
          id="colors"
          title="Colors"
          description="Brand, neutral, semantic, and accent color tokens defined in tailwind.config.js."
        />

        <SubHeading>Primary</SubHeading>
        <p className="text-sm text-gray-500 mb-4">
          The primary brand scale. Used for buttons, links, focus rings, and interactive elements.
        </p>
        <div className="flex flex-wrap gap-4 mb-8">
          <ColorSwatch
            name="primary-50"
            hex="#f0f7ff"
            className="bg-primary-50 border border-gray-200"
          />
          <ColorSwatch name="primary-100" hex="#dbeafe" className="bg-primary-100" />
          <ColorSwatch name="primary-200" hex="#b4d3f5" className="bg-primary-200" />
          <ColorSwatch name="primary-300" hex="#7bb3e8" className="bg-primary-300" />
          <ColorSwatch name="primary-400" hex="#4a90d9" className="bg-primary-400" />
          <ColorSwatch name="primary-500" hex="#2e6eb5" className="bg-primary-500" />
          <ColorSwatch name="primary-600" hex="#1d5a9e" className="bg-primary-600" />
          <ColorSwatch name="primary-700" hex="#164a84" className="bg-primary-700" />
          <ColorSwatch name="primary-800" hex="#113b6a" className="bg-primary-800" />
          <ColorSwatch name="primary-900" hex="#0c2d52" className="bg-primary-900" />
        </div>

        <SubHeading>Neutrals (Gray)</SubHeading>
        <p className="text-sm text-gray-500 mb-4">
          Used for text, backgrounds, borders, and dividers. Tailwind default gray scale (to be
          replaced with warm neutrals).
        </p>
        <div className="flex flex-wrap gap-4 mb-8">
          <ColorSwatch name="gray-50" hex="#f9fafb" className="bg-gray-50 border border-gray-200" />
          <ColorSwatch name="gray-100" hex="#f3f4f6" className="bg-gray-100" />
          <ColorSwatch name="gray-200" hex="#e5e7eb" className="bg-gray-200" />
          <ColorSwatch name="gray-300" hex="#d1d5db" className="bg-gray-300" />
          <ColorSwatch name="gray-400" hex="#9ca3af" className="bg-gray-400" />
          <ColorSwatch name="gray-500" hex="#6b7280" className="bg-gray-500" />
          <ColorSwatch name="gray-600" hex="#4b5563" className="bg-gray-600" />
          <ColorSwatch name="gray-700" hex="#374151" className="bg-gray-700" />
          <ColorSwatch name="gray-800" hex="#1f2937" className="bg-gray-800" />
          <ColorSwatch name="gray-900" hex="#111827" className="bg-gray-900" />
        </div>

        <SubHeading>Semantic</SubHeading>
        <p className="text-sm text-gray-500 mb-4">
          Status colors for alerts, badges, and validation states.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <span className="text-sm font-medium text-green-800">Success</span>
            <div className="flex gap-2 mt-2">
              <div className="w-6 h-6 rounded bg-green-50 border border-green-200" />
              <div className="w-6 h-6 rounded bg-green-200" />
              <div className="w-6 h-6 rounded bg-green-600" />
              <div className="w-6 h-6 rounded bg-green-800" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <span className="text-sm font-medium text-red-800">Error</span>
            <div className="flex gap-2 mt-2">
              <div className="w-6 h-6 rounded bg-red-50 border border-red-200" />
              <div className="w-6 h-6 rounded bg-red-200" />
              <div className="w-6 h-6 rounded bg-red-600" />
              <div className="w-6 h-6 rounded bg-red-800" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <span className="text-sm font-medium text-amber-800">Warning</span>
            <div className="flex gap-2 mt-2">
              <div className="w-6 h-6 rounded bg-amber-50 border border-amber-200" />
              <div className="w-6 h-6 rounded bg-amber-200" />
              <div className="w-6 h-6 rounded bg-amber-600" />
              <div className="w-6 h-6 rounded bg-amber-800" />
            </div>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <span className="text-sm font-medium text-primary-800">Info</span>
            <div className="flex gap-2 mt-2">
              <div className="w-6 h-6 rounded bg-primary-50 border border-primary-200" />
              <div className="w-6 h-6 rounded bg-primary-200" />
              <div className="w-6 h-6 rounded bg-primary-600" />
              <div className="w-6 h-6 rounded bg-primary-800" />
            </div>
          </div>
        </div>

        <SubHeading>Accents</SubHeading>
        <div className="flex flex-wrap gap-4 mb-8">
          <ColorSwatch name="accent-teal-500" hex="#14b8a6" className="bg-accent-teal-500" />
          <ColorSwatch name="accent-teal-600" hex="#0d9488" className="bg-accent-teal-600" />
          <ColorSwatch name="accent-teal-700" hex="#0f766e" className="bg-accent-teal-700" />
          <ColorSwatch name="accent-amber-400" hex="#fbbf24" className="bg-accent-amber-400" />
          <ColorSwatch name="accent-amber-500" hex="#f59e0b" className="bg-accent-amber-500" />
          <ColorSwatch name="accent-amber-600" hex="#d97706" className="bg-accent-amber-600" />
        </div>

        {/* ================================================================ */}
        {/* TYPOGRAPHY */}
        {/* ================================================================ */}
        <SectionHeading
          id="typography"
          title="Typography"
          description="Inter is the sole typeface. Personality comes from weight contrast and scale, not font pairing."
        />

        <SubHeading>Font Family</SubHeading>
        <div className="grid sm:grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-gray-400 mb-2 font-mono">font-heading</p>
            <p className="text-3xl font-bold font-heading text-gray-900">Inter — Headings</p>
            <p className="text-sm text-gray-500 mt-1">
              Weights 600–700. Tight letter-spacing at large sizes.
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2 font-mono">font-body</p>
            <p className="text-lg font-body text-gray-700">Inter — Body text and UI elements</p>
            <p className="text-sm text-gray-500 mt-1">
              Weights 400–500. Optimized for screen legibility.
            </p>
          </div>
        </div>

        <SubHeading>Type Scale</SubHeading>
        <div className="space-y-6 mb-8">
          {[
            {
              name: 'text-5xl',
              size: '48px / 3rem',
              weight: '700',
              className: 'text-5xl font-bold font-heading',
              sample: 'Hero Heading',
            },
            {
              name: 'text-4xl',
              size: '36px / 2.25rem',
              weight: '700',
              className: 'text-4xl font-bold font-heading',
              sample: 'Page Title',
            },
            {
              name: 'text-3xl',
              size: '30px / 1.875rem',
              weight: '700',
              className: 'text-3xl font-bold font-heading',
              sample: 'Section Heading',
            },
            {
              name: 'text-2xl',
              size: '24px / 1.5rem',
              weight: '600',
              className: 'text-2xl font-semibold font-heading',
              sample: 'Subsection Title',
            },
            {
              name: 'text-xl',
              size: '20px / 1.25rem',
              weight: '600',
              className: 'text-xl font-semibold',
              sample: 'Card Heading',
            },
            {
              name: 'text-lg',
              size: '18px / 1.125rem',
              weight: '500',
              className: 'text-lg font-medium',
              sample: 'Lead paragraph or subtitle text',
            },
            {
              name: 'text-base',
              size: '16px / 1rem',
              weight: '400',
              className: 'text-base',
              sample: 'Body text — the default size for paragraphs and content.',
            },
            {
              name: 'text-sm',
              size: '14px / 0.875rem',
              weight: '400',
              className: 'text-sm',
              sample: 'Secondary text, labels, and helper text',
            },
            {
              name: 'text-xs',
              size: '12px / 0.75rem',
              weight: '400',
              className: 'text-xs',
              sample: 'Captions, timestamps, and fine print',
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-baseline gap-6 border-b border-gray-100 pb-4"
            >
              <div className="w-32 flex-shrink-0">
                <span className="text-xs font-mono text-gray-400">{item.name}</span>
                <br />
                <span className="text-xs text-gray-400">{item.size}</span>
              </div>
              <p className={`text-gray-900 ${item.className}`}>{item.sample}</p>
            </div>
          ))}
        </div>

        {/* ================================================================ */}
        {/* SPACING */}
        {/* ================================================================ */}
        <SectionHeading
          id="spacing"
          title="Spacing"
          description="Tailwind's 4px base scale with semantic tokens for consistent section and component spacing."
        />

        <SubHeading>Base Scale</SubHeading>
        <div className="flex flex-wrap items-end gap-4 mb-8">
          {[
            { name: '1', px: '4px' },
            { name: '2', px: '8px' },
            { name: '3', px: '12px' },
            { name: '4', px: '16px' },
            { name: '6', px: '24px' },
            { name: '8', px: '32px' },
            { name: '12', px: '48px' },
            { name: '16', px: '64px' },
            { name: '24', px: '96px' },
          ].map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-1">
              <div className="bg-primary-200 rounded" style={{ width: s.px, height: s.px }} />
              <span className="text-xs font-mono text-gray-500">{s.name}</span>
              <span className="text-xs text-gray-400">{s.px}</span>
            </div>
          ))}
        </div>

        <SubHeading>Semantic Tokens</SubHeading>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Token</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Value</th>
                <th className="text-left py-2 font-medium text-gray-700">Usage</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-section-y</td>
                <td className="py-2 pr-4">py-16 sm:py-24</td>
                <td className="py-2">Vertical padding between major sections</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-section-y-compact</td>
                <td className="py-2 pr-4">py-12 sm:py-16</td>
                <td className="py-2">Compact sections</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-content-gap</td>
                <td className="py-2 pr-4">gap-6 or gap-8</td>
                <td className="py-2">Space between content blocks</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-stack-sm</td>
                <td className="py-2 pr-4">space-y-2</td>
                <td className="py-2">Tight stacking (list items)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-stack-md</td>
                <td className="py-2 pr-4">space-y-4</td>
                <td className="py-2">Medium stacking (form fields)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-stack-lg</td>
                <td className="py-2 pr-4">space-y-6</td>
                <td className="py-2">Loose stacking (section blocks)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">space-container</td>
                <td className="py-2 pr-4">max-w-5xl mx-auto px-4 sm:px-6</td>
                <td className="py-2">Standard page container</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">space-container-narrow</td>
                <td className="py-2 pr-4">max-w-2xl mx-auto px-4 sm:px-6</td>
                <td className="py-2">Narrow content (forms, legal)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================================================================ */}
        {/* BORDERS & RADIUS */}
        {/* ================================================================ */}
        <SectionHeading
          id="borders"
          title="Borders & Radius"
          description="Three radius tiers plus full. Standardized border treatments."
        />

        <SubHeading>Border Radius</SubHeading>
        <div className="flex flex-wrap gap-8 mb-8">
          {[
            { name: 'rounded-sm', value: '6px', className: 'rounded-sm' },
            { name: 'rounded (default)', value: '8px', className: 'rounded' },
            { name: 'rounded-lg', value: '12px', className: 'rounded-lg' },
            { name: 'rounded-full', value: '9999px', className: 'rounded-full' },
          ].map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className={`w-20 h-20 bg-primary-100 border-2 border-primary-300 ${r.className}`}
              />
              <span className="text-xs font-medium text-gray-700">{r.name}</span>
              <span className="text-xs text-gray-400 font-mono">{r.value}</span>
            </div>
          ))}
        </div>

        <SubHeading>Border Styles</SubHeading>
        <div className="flex flex-wrap gap-6 mb-8">
          <div className="w-40 h-20 rounded-lg border border-gray-200 flex items-center justify-center text-xs text-gray-500">
            border-gray-200
          </div>
          <div className="w-40 h-20 rounded-lg border border-gray-300 flex items-center justify-center text-xs text-gray-500">
            border-gray-300
          </div>
          <div className="w-40 h-20 rounded-lg border-l-4 border-l-primary-400 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
            Left accent
          </div>
          <div className="w-40 h-20 rounded-lg border-l-4 border-l-accent-teal-500 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
            Teal accent
          </div>
        </div>

        {/* ================================================================ */}
        {/* SHADOWS */}
        {/* ================================================================ */}
        <SectionHeading
          id="shadows"
          title="Shadows"
          description="Three elevation levels for progressive depth."
        />

        <div className="flex flex-wrap gap-8 mb-8">
          {[
            { name: 'shadow-sm', desc: 'Subtle — headers, resting cards', className: 'shadow-sm' },
            { name: 'shadow-md', desc: 'Medium — hover states', className: 'shadow-md' },
            { name: 'shadow-lg', desc: 'Elevated — modals, dropdowns', className: 'shadow-lg' },
          ].map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <div
                className={`w-32 h-24 bg-white rounded-lg ${s.className} flex items-center justify-center`}
              >
                <span className="text-xs font-mono text-gray-500">{s.name}</span>
              </div>
              <span className="text-xs text-gray-400 text-center max-w-[128px]">{s.desc}</span>
            </div>
          ))}
        </div>

        {/* ================================================================ */}
        {/* COMPONENTS */}
        {/* ================================================================ */}
        <SectionHeading
          id="components"
          title="Components"
          description="Every UI component rendered in all variants and states."
        />

        {/* Button */}
        <SubHeading>Button</SubHeading>
        <p className="text-sm text-gray-500 mb-4">
          4 variants (primary, secondary, danger, ghost) &times; 3 sizes (sm, md, lg). Plus loading
          and disabled states.
        </p>

        <div className="space-y-6 mb-8">
          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">Variants (md size)</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">Sizes (primary variant)</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">States</p>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button disabled>Disabled</Button>
              <Button isLoading>Loading</Button>
            </div>
          </div>
        </div>

        <CodeBlock>{`<Button variant="primary" size="md">Label</Button>
<Button variant="ghost">Ghost Button</Button>
<Button isLoading>Submitting...</Button>`}</CodeBlock>

        {/* Input */}
        <SubHeading>Input</SubHeading>
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <Input
            label="Default Input"
            placeholder="Placeholder text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            label="With Helper Text"
            placeholder="Enter your email"
            helperText="We'll never share your email."
          />
          <Input
            label="Error State"
            placeholder="Required field"
            error="This field is required"
            value=""
            readOnly
          />
          <Input label="Disabled" placeholder="Cannot edit" disabled />
        </div>

        <CodeBlock>{`<Input label="Email" placeholder="you@example.com" error="Required" />
<Input label="Name" helperText="As it appears on your ID" />`}</CodeBlock>

        {/* Alert */}
        <SubHeading>Alert</SubHeading>
        <div className="space-y-3 mb-6">
          <Alert type="success">Success — your changes have been saved.</Alert>
          <Alert type="error">Error — something went wrong. Please try again.</Alert>
          <Alert type="warning">Warning — your mailbox will expire in 2 days.</Alert>
          <Alert type="info">Info — groups in your area have been notified.</Alert>
        </div>

        <CodeBlock>{`<Alert type="success">Your changes have been saved.</Alert>
<Alert type="error">Something went wrong.</Alert>`}</CodeBlock>

        {/* Badge */}
        <SubHeading>Badge</SubHeading>
        <div className="flex flex-wrap gap-3 mb-6">
          <Badge>Default</Badge>
          <Badge variant="success">Verified</Badge>
          <Badge variant="warning">Pilot</Badge>
          <Badge variant="error">Revoked</Badge>
          <Badge variant="info">New</Badge>
        </div>

        <CodeBlock>{`<Badge variant="success">Verified</Badge>
<Badge variant="warning">Pilot</Badge>`}</CodeBlock>

        {/* CheckboxGroup */}
        <SubHeading>CheckboxGroup</SubHeading>
        <div className="max-w-sm mb-6">
          <CheckboxGroup
            label="Aid Categories"
            options={[
              { value: 'rent', label: 'Rent' },
              { value: 'food', label: 'Food' },
              { value: 'utilities', label: 'Utilities' },
              { value: 'other', label: 'Other' },
            ]}
            value={checkboxValue}
            onChange={setCheckboxValue}
          />
        </div>

        <CodeBlock>{`<CheckboxGroup
  label="Aid Categories"
  options={[{ value: 'rent', label: 'Rent' }, ...]}
  value={selected}
  onChange={setSelected}
/>`}</CodeBlock>

        {/* IconCircle */}
        <SubHeading>IconCircle</SubHeading>
        <p className="text-sm text-gray-500 mb-4">
          Reusable icon-in-circle pattern. 3 sizes &times; 5 color presets.
        </p>
        <div className="space-y-4 mb-6">
          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">Sizes</p>
            <div className="flex items-center gap-4">
              <IconCircle icon={faHandHoldingHeart} size="sm" />
              <IconCircle icon={faHandHoldingHeart} size="md" />
              <IconCircle icon={faHandHoldingHeart} size="lg" />
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">Colors</p>
            <div className="flex items-center gap-4">
              <IconCircle icon={faShieldHalved} color="primary" />
              <IconCircle icon={faBuilding} color="gray" />
              <IconCircle icon={faCheck} color="green" />
              <IconCircle icon={faXmark} color="red" />
              <IconCircle icon={faLightbulb} color="amber" />
            </div>
          </div>
        </div>

        <CodeBlock>{`<IconCircle icon={faShieldHalved} size="lg" color="primary" />
<IconCircle icon={faCheck} size="sm" color="green" />`}</CodeBlock>

        {/* Divider */}
        <SubHeading>Divider</SubHeading>
        <div className="space-y-6 mb-6">
          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">Solid</p>
            <Divider />
          </div>
          <div>
            <p className="text-xs font-mono text-gray-400 mb-2">Gradient</p>
            <Divider gradient />
          </div>
        </div>

        <CodeBlock>{`<Divider />
<Divider gradient />`}</CodeBlock>

        {/* Container */}
        <SubHeading>Container</SubHeading>
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-2">
            <Container className="bg-primary-50 rounded py-4 text-center text-sm text-primary-700">
              Container (max-w-5xl)
            </Container>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <Container
              narrow
              className="bg-primary-50 rounded py-4 text-center text-sm text-primary-700"
            >
              Container narrow (max-w-2xl)
            </Container>
          </div>
        </div>

        <CodeBlock>{`<Container>Standard width content</Container>
<Container narrow>Narrow content (forms, legal)</Container>`}</CodeBlock>

        {/* ================================================================ */}
        {/* ICONS */}
        {/* ================================================================ */}
        <SectionHeading
          id="icons"
          title="Icons"
          description="FontAwesome Solid icons used throughout the application."
        />

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 mb-8">
          {[
            { icon: faCheck, name: 'faCheck' },
            { icon: faLock, name: 'faLock' },
            { icon: faArrowRight, name: 'faArrowRight' },
            { icon: faXmark, name: 'faXmark' },
            { icon: faHandHoldingHeart, name: 'faHandHoldingHeart' },
            { icon: faBuilding, name: 'faBuilding' },
            { icon: faShieldHalved, name: 'faShieldHalved' },
            { icon: faEnvelope, name: 'faEnvelope' },
            { icon: faLocationDot, name: 'faLocationDot' },
            { icon: faComments, name: 'faComments' },
            { icon: faHandshake, name: 'faHandshake' },
            { icon: faEyeSlash, name: 'faEyeSlash' },
            { icon: faLightbulb, name: 'faLightbulb' },
            { icon: faBuildingColumns, name: 'faBuildingColumns' },
            { icon: faUsers, name: 'faUsers' },
            { icon: faGlobe, name: 'faGlobe' },
          ].map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={item.icon} className="text-xl text-gray-600" />
              <span className="text-xs text-gray-400 text-center leading-tight">{item.name}</span>
            </div>
          ))}
        </div>

        {/* ================================================================ */}
        {/* LAYOUT */}
        {/* ================================================================ */}
        <SectionHeading
          id="layout"
          title="Layout"
          description="Container widths, breakpoints, and section spacing conventions."
        />

        <SubHeading>Breakpoints</SubHeading>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Prefix</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Min Width</th>
                <th className="text-left py-2 font-medium text-gray-700">Usage</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">sm:</td>
                <td className="py-2 pr-4">640px</td>
                <td className="py-2">Stack-to-row transitions, 2-column grids</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">md:</td>
                <td className="py-2 pr-4">768px</td>
                <td className="py-2">Side-by-side columns, hero split layout</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">lg:</td>
                <td className="py-2 pr-4">1024px</td>
                <td className="py-2">4-column grids, full-width layouts</td>
              </tr>
            </tbody>
          </table>
        </div>

        <SubHeading>Container Widths</SubHeading>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Component</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Max Width</th>
                <th className="text-left py-2 font-medium text-gray-700">Usage</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">{`<Container />`}</td>
                <td className="py-2 pr-4">max-w-5xl (1024px)</td>
                <td className="py-2">Standard page sections</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">{`<Container narrow />`}</td>
                <td className="py-2 pr-4">max-w-2xl (672px)</td>
                <td className="py-2">Forms, legal pages, focused content</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">max-w-xl</td>
                <td className="py-2 pr-4">576px</td>
                <td className="py-2">Contact form, login form</td>
              </tr>
            </tbody>
          </table>
        </div>

        <SubHeading>Motion</SubHeading>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Token</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Duration</th>
                <th className="text-left py-2 font-medium text-gray-700">Usage</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">duration-fast</td>
                <td className="py-2 pr-4">100ms</td>
                <td className="py-2">Hover color changes</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-xs">duration-normal</td>
                <td className="py-2 pr-4">200ms</td>
                <td className="py-2">Button presses, focus rings</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">duration-slow</td>
                <td className="py-2 pr-4">300ms</td>
                <td className="py-2">Layout shifts, reveals</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-400">
          Relay Design System &mdash; Internal documentation for developers and designers.
        </div>
      </footer>
    </div>
  );
}
