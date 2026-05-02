import { LegacyPage } from '@/components/legacy/LegacyPage';

export default function ProfilePage() {
  return (
    <LegacyPage
      fileName="profile.html"
      scriptId="legacy-profile-page"
      scriptSrc="/legacy-scripts/profile"
    />
  );
}
