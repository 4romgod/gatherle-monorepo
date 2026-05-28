import { useAppShell } from '@/app/providers/AppShellProvider';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';

type HeaderMenuButtonProps = {
  tintColor?: string;
};

export function HeaderMenuButton({ tintColor }: HeaderMenuButtonProps) {
  const { openDrawer } = useAppShell();

  return (
    <HeaderIconButton
      accessibilityLabel="Open navigation menu"
      icon="menu"
      onPress={openDrawer}
      size={20}
      tintColor={tintColor}
    />
  );
}
