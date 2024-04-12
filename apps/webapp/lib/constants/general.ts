import * as HeroIcons from '@heroicons/react/24/outline';

type IconComponents = {
  [key: string]: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>
  >;
};

export const ICON_MAPPING: IconComponents = {
  PaintBrushIcon: HeroIcons.PaintBrushIcon,
  MusicalNoteIcon: HeroIcons.MusicalNoteIcon,
  CpuChipIcon: HeroIcons.CpuChipIcon,
  HeartIcon: HeroIcons.HeartIcon,
  DumbbellIcon: HeroIcons.PlusCircleIcon,
  CakeIcon: HeroIcons.CakeIcon,
  WineGlassIcon: HeroIcons.AdjustmentsVerticalIcon,
  GlobeAmericasIcon: HeroIcons.GlobeAmericasIcon,
  MusicIcon: HeroIcons.MusicalNoteIcon,
  PresentationChartBarIcon: HeroIcons.PresentationChartBarIcon,
  UserGroupIcon: HeroIcons.UserGroupIcon,
};
