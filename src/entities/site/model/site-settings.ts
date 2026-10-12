import { getSiteSettings } from '@/shared/api';
import { routes } from '@/shared/routes';

export async function loadSiteSettings() {
  const settings = await getSiteSettings();
  const navigation = settings.navigation.map((item) => ({
    ...item,
    href: item.href === '/#about' ? routes.about : item.href,
  }));
  if (!navigation.some((item) => item.href === routes.contacts)) {
    navigation.push({ label: 'Контакты', href: routes.contacts });
  }
  return { ...settings, navigation };
}
