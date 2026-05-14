import type { CompositeNavigationProp } from '@react-navigation/native';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from './routes';

export type MainTabNavigation = CompositeNavigationProp<
  MaterialTopTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type DetailNavigation = NativeStackNavigationProp<RootStackParamList>;
