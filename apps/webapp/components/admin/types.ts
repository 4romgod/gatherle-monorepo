export type AdminSectionProps = {
  token?: string | null;
};

export type AdminUsersSectionProps = AdminSectionProps & {
  currentUserId?: string | null;
};
