declare module '@tabler/icons-react-native/*' {
  import type { ForwardRefExoticComponent } from 'react';
  import type { SvgProps } from 'react-native-svg';

  interface TablerIconProps extends SvgProps {
    size?: string | number;
    strokeWidth?: string | number;
    title?: string;
  }

  const TablerIcon: ForwardRefExoticComponent<TablerIconProps>;

  export default TablerIcon;
}
