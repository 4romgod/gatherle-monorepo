import { Box, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

interface CustomContainerProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
  maxWidthOverrides?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
  };
}

export default function CustomContainer({ children, sx, maxWidthOverrides }: CustomContainerProps) {
  return (
    <Box
      component="div"
      sx={{
        ...sx,
        maxWidth: {
          xs: maxWidthOverrides?.xs ?? '97%',
          sm: maxWidthOverrides?.sm ?? '94%',
          md: maxWidthOverrides?.md ?? '90%',
          lg: maxWidthOverrides?.lg ?? '80%',
        },
        mx: 'auto',
      }}
    >
      {children}
    </Box>
  );
}
