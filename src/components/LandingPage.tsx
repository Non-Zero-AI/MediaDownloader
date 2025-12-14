import React, { useState } from 'react';
import { Download, Video, Music, FileText, Database, MessageSquare, Zap, Check, ArrowRight, Sparkles } from 'lucide-react';
import Auth from './Auth';

const LandingPage: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);

  const features = [
    {
      icon: Video,
      title: 'Download Videos',
      description: 'Download any YouTube video in high quality MP4 format',
    },
    {
      icon: Music,
      title: 'Extract Audio',
      description: 'Convert videos to MP3 with optional voice isolation',
    },
    {
      icon: FileText,
      title: 'Transcribe to Text',
      description: 'Get accurate transcriptions using AI-powered Whisper',
    },
    {
      icon: Database,
      title: 'Knowledge Base',
      description: 'Automatically store video information for AI interactions',
    },
    {
      icon: MessageSquare,
      title: 'AI Chat Agent',
      description: 'Chat with your downloaded content using your own AI agent',
    },
    {
      icon: Zap,
      title: 'Fast Processing',
      description: 'Lightning-fast downloads and processing',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      downloads: '5 downloads/month',
      features: [
        '5 downloads per month',
        'Video, audio, and text downloads',
        'Basic knowledge base storage',
        'AI chat with your content',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$5',
      period: 'per month',
      downloads: 'Unlimited downloads',
      features: [
        'Unlimited downloads',
        'All free features included',
        'Priority processing',
        'Advanced knowledge base',
        'Enhanced AI capabilities',
      ],
      cta: 'Upgrade to Pro',
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full mb-8 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">AI-Powered Media Downloader</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              Download, Store & Chat
              <br />
              with Any YouTube Content
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Transform YouTube videos into videos, audio, or text. Build your personal knowledge base and interact with your content using AI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowAuth(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg flex items-center gap-2 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg font-semibold text-lg hover:bg-white/20 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-indigo-900 to-purple-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to download, store, and interact with YouTube content
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-purple-400/50 transition-all hover:transform hover:scale-105"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gradient-to-b from-purple-900 to-indigo-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Start free, upgrade when you need more
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white/10 backdrop-blur-lg rounded-xl p-8 border-2 transition-all hover:transform hover:scale-105 ${
                  plan.popular
                    ? 'border-purple-400 shadow-2xl shadow-purple-500/50'
                    : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    {plan.period !== 'forever' && (
                      <span className="text-gray-400">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-gray-300">{plan.downloads}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => setShowAuth(true)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of users downloading and organizing their favorite YouTube content
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg flex items-center gap-2 hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 mx-auto"
            >
              Start Your Free Account
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowAuth(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
            >
              ×
            </button>
            <Auth onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
