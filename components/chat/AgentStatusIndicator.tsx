'use client';

import { AgentStatus } from '@/lib/types/chat';
import { motion } from 'framer-motion';
import { Loader2, Brain, Search, BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
  className?: string;
}

export default function AgentStatusIndicator({
  status,
  className,
}: AgentStatusIndicatorProps) {
  if (status === 'idle') return null;

  const statusConfig = {
    thinking: {
      icon: Brain,
      label: 'Thinking',
      color: 'text-blue-500',
    },
    searching: {
      icon: Search,
      label: 'Searching listings',
      color: 'text-green-500',
    },
    analyzing: {
      icon: BarChart3,
      label: 'Analyzing results',
      color: 'text-purple-500',
    },
    scheduling: {
      icon: Loader2,
      label: 'Scheduling appointment',
      color: 'text-amber-500',
    },
    estimating: {
      icon: Loader2,
      label: 'Estimating costs',
      color: 'text-cyan-500',
    },
    error: {
      icon: AlertCircle,
      label: 'Error occurred',
      color: 'text-red-500',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  const Icon = config?.icon || Loader2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-center gap-2 px-3 py-2', className)}
    >
      <motion.div
        animate={{ rotate: status === 'error' ? 0 : 360 }}
        transition={{
          duration: 2,
          repeat: status === 'error' ? 0 : Infinity,
          ease: 'linear',
        }}
      >
        <Icon className={cn('h-4 w-4', config?.color)} />
      </motion.div>
      <span className="text-sm text-muted-foreground">{config?.label}</span>
      <div className="flex gap-1 ml-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn('w-1 h-1 rounded-full', config?.color, 'opacity-30')}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
