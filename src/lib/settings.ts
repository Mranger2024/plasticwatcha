import { supabase } from '@/lib/supabase/client';

export interface AISettings {
  ai_enabled: boolean;
  ai_confidence_threshold: number;
}

export async function getAISettings(): Promise<AISettings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('ai_enabled, ai_confidence_threshold')
    .single();

  if (error) {
    console.error('Error fetching AI settings:', error);
    return null;
  }

  return {
    ai_enabled: data?.ai_enabled ?? false,
    ai_confidence_threshold: data?.ai_confidence_threshold ?? 0.7,
  };
}
