import {
  Wrench,
  Zap,
  SprayCan,
  Paintbrush,
  Hammer,
  Wind,
  Bug,
  Settings,
} from 'lucide-react-native';

/**
 * Service icon registry — maps the string icon names stored in src/data/mockServices.js
 * (icon: 'Wrench', 'Zap', …) to their lucide-react-native components at render time.
 *
 * This is the "store icon names in data, map to components at render" approach the migration
 * plan recommended. Note: the WEB dashboard had a bug — it keyed off `s.iconComponent` (a field
 * that doesn't exist), so every service silently fell back to Wrench. We fix that here by
 * keying off the real `s.icon` string, so each service shows its correct icon.
 */
export const SERVICE_ICONS = {
  Wrench,
  Zap,
  SprayCan,
  Paintbrush,
  Hammer,
  Wind,
  Bug,
  Settings,
};

/** Resolve a service's icon name to a component, defaulting to Wrench if unknown. */
export function serviceIcon(name) {
  return SERVICE_ICONS[name] || Wrench;
}
