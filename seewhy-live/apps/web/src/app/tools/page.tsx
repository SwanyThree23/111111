'use client';
import Link from 'next/link';
import { NavBar } from '@/components/ui/NavBar';
import { motion } from 'framer-motion';
import {
  Layers, Music, Video, Code2, Chrome, Cpu,
  ArrowRight, Sparkles, Zap,
} from 'lucide-react';

const TOOLS = [
  {
    href: '/tools/overlays',
    title: 'Stream Overlays',
    desc: 'AI-powered dynamic overlays for alerts, tips, and events. Glassmorphic design with real-time animations.',
    icon: Layers,
    color: '#C8FF00',
    tag: 'AI-Powered',
  },
  {
    href: '/tools/vst',
    title: 'VST Audio Mixer',
    desc: 'Route DAW audio directly into your stream. Support for Ableton, FL Studio, Logic Pro and more.',
    icon: Music,
    color: '#A855F7',
    tag: 'Pro Audio',
  },
  {
    href: '/tools/recorder',
    title: 'Stream Recorder',
    desc: 'Automatic cloud recording with AI-powered highlight detection and clip generation.',
    icon: Video,
    color: '#FF3B3B',
    tag: 'Auto-Record',
  },
  {
    href: '/tools/sdk',
    title: 'Developer SDK',
    desc: 'Build custom integrations with the SeeWhy LIVE API. WebSocket events, REST endpoints, and webhooks.',
    icon: Code2,
    color: '#00E5CC',
    tag: 'API v2',
  },
  {
    href: '/tools/extension',
    title: 'Browser Extension',
    desc: 'Quick actions, chat moderation, and stream controls from any browser tab.',
    icon: Chrome,
    color: '#FF7A1A',
    tag: 'Coming Soon',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-[#0C0806]">
      <NavBar />
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Cpu size={24} className="text-[#C8FF00]" />
            <h1 className="font-display text-5xl text-white">CREATOR TOOLS</h1>
          </div>
          <p className="text-gray-400 max-w-xl">
            Professional-grade streaming utilities built for creators who demand more. Every tool designed to elevate your production value.
          </p>
        </div>

        {/* Tools Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <motion.div key={tool.href} variants={cardVariants}>
                <Link
                  href={tool.href}
                  className="card group block hover:border-[var(--border-light)] transition-all duration-300 relative overflow-hidden"
                >
                  {/* Ambient glow */}
                  <div
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl"
                    style={{ background: tool.color }}
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${tool.color}15` }}>
                        <Icon size={20} style={{ color: tool.color }} />
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ color: tool.color, background: `${tool.color}12` }}
                      >
                        {tool.tag}
                      </span>
                    </div>

                    <h3 className="font-display text-xl text-white mb-1 group-hover:text-[#C8FF00] transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                      {tool.desc}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs font-ui text-gray-600 group-hover:text-[#C8FF00] transition-colors">
                      Open Tool <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Feature callout */}
        <div className="mt-10 card border-[#C8FF00]/20 volt-glow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C8FF00]/10 flex items-center justify-center shrink-0">
              <Sparkles size={24} className="text-[#C8FF00]" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl text-[#C8FF00]">AI-POWERED EVERYTHING</h3>
              <p className="text-sm text-gray-400">
                Every tool leverages Aura AI for intelligent automation — from auto-generated overlays to real-time content moderation and highlight detection.
              </p>
            </div>
            <Link href="/studio" className="btn-volt py-2 px-4 text-sm flex items-center gap-1.5 shrink-0">
              <Zap size={14} /> Try It Live
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
