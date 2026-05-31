import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminOrganizationsSection from '@/components/admin/AdminOrganizationsSection';

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseInfiniteScroll = jest.fn();
const mockSetToastProps = jest.fn();
const mockCreateOrganization = jest.fn();
const mockUpdateOrganization = jest.fn();
const mockDeleteOrganization = jest.fn();
const mockRefetch = jest.fn();
const mockFetchMore = jest.fn();
let infiniteScrollConfig: Record<string, unknown> | null = null;

jest.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

jest.mock('@/data/graphql/query', () => ({
  CreateOrganizationDocument: 'CreateOrganizationDocument',
  GetOrganizationsDocument: 'GetOrganizationsDocument',
  UpdateOrganizationDocument: 'UpdateOrganizationDocument',
  DeleteOrganizationDocument: 'DeleteOrganizationDocument',
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: jest.fn(() => ({})),
}));

jest.mock('@/hooks/useAppContext', () => ({
  useAppContext: () => ({ setToastProps: mockSetToastProps }),
}));

jest.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: (config: Record<string, unknown>) => {
    infiniteScrollConfig = config;
    return mockUseInfiniteScroll(config);
  },
}));

jest.mock('@/components/admin/ConfirmDialog', () => ({
  __esModule: true,
  default: ({
    open,
    title,
    confirmLabel,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div>
        <div>{title}</div>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm}>{confirmLabel ?? 'Confirm'}</button>
      </div>
    ) : null,
}));

jest.mock('@/components/admin/AdminOrganizationMembersDialog', () => ({
  __esModule: true,
  default: ({ open, organization }: { open: boolean; organization?: { name?: string } | null }) =>
    open ? <div>{`Members for ${organization?.name ?? 'Organization'}`}</div> : null,
}));

jest.mock('@/components/admin/admin-ui', () => ({
  ADMIN_SURFACE_SX: {},
  AdminEmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  AdminListFooter: () => <div>footer</div>,
  AdminListSearchField: ({
    value,
    onChange,
    helperText,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    helperText?: string;
    placeholder?: string;
  }) => (
    <div>
      <label htmlFor="org-search">Organization search</label>
      <input
        id="org-search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText ? <span>{helperText}</span> : null}
    </div>
  ),
  AdminSectionHeader: ({
    title,
    description,
    meta,
    actions,
  }: {
    title: string;
    description: string;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {meta}
      {actions}
    </div>
  ),
}));

describe('AdminOrganizationsSection', () => {
  const buildOrganization = (index: number) => ({
    orgId: `org-${index}`,
    ownerId: `owner-${index}`,
    slug: `market-org-${index}`,
    name: `Market Org ${index}`,
    description: 'A local market collective.',
    billingEmail: 'hello@market.org',
    tags: ['community'],
    domainsAllowed: ['market.org'],
    defaultVisibility: 'Public',
    memberRoles: [
      {
        role: 'Owner',
        userId: `owner-${index}`,
        username: index === 1 ? 'gatherle-imports' : `owner-${index}`,
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    infiniteScrollConfig = null;
    mockUseInfiniteScroll.mockReturnValue(jest.fn());
    mockCreateOrganization.mockResolvedValue({ data: { createOrganization: { orgId: 'org-new' } } });
    mockUpdateOrganization.mockResolvedValue({ data: { updateOrganization: { orgId: 'org-1' } } });
    mockDeleteOrganization.mockResolvedValue({ data: { deleteOrganization: true } });
    mockUseMutation.mockImplementation((document: string) => {
      if (document === 'CreateOrganizationDocument') return [mockCreateOrganization, { loading: false }];
      if (document === 'UpdateOrganizationDocument') return [mockUpdateOrganization, { loading: false }];
      if (document === 'DeleteOrganizationDocument') return [mockDeleteOrganization, { loading: false }];
      return [jest.fn(), { loading: false }];
    });
    mockUseQuery.mockReturnValue({
      data: {
        readOrganizations: [
          {
            ...buildOrganization(1),
            ownerId: 'owner-123456789',
            slug: 'market-org',
            name: 'Market Org',
            memberRoles: [
              {
                role: 'Owner',
                userId: 'owner-123456789',
                username: 'gatherle-imports',
              },
            ],
          },
        ],
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchMore: mockFetchMore,
    });
  });

  function readLastToastMessage() {
    const updater = mockSetToastProps.mock.calls.at(-1)?.[0] as
      | ((prev: Record<string, unknown>) => Record<string, unknown>)
      | undefined;
    if (!updater) return null;
    return updater({}).message;
  }

  it('shows the resolved owner username instead of a raw owner id', () => {
    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    expect(screen.getByText('Owner · @gatherle-imports')).toBeTruthy();
    expect(screen.queryByText(/owner-123456789/)).toBeNull();
  });

  it('disables organization creation when the admin session has no current user id', () => {
    render(<AdminOrganizationsSection token="token" currentUserId={null} />);

    expect((screen.getByRole('button', { name: 'Create organization' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the empty state when there are no organizations', () => {
    mockUseQuery.mockReturnValue({
      data: {
        readOrganizations: [],
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchMore: mockFetchMore,
    });

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    expect(screen.getByText('No organizations found')).toBeTruthy();
    expect(screen.getByText('Organizations will appear here once they are created.')).toBeTruthy();
  });

  it('renders the search empty state after the debounced query updates', async () => {
    jest.useFakeTimers();
    mockUseQuery.mockReturnValue({
      data: {
        readOrganizations: [],
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchMore: mockFetchMore,
    });

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.change(screen.getByLabelText('Organization search'), { target: { value: 'market' } });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('No matching organizations')).toBeTruthy();
    });
    expect(mockUseQuery.mock.calls.at(-1)?.[1]).toEqual(
      expect.objectContaining({
        variables: expect.objectContaining({
          options: expect.objectContaining({
            search: expect.objectContaining({ value: 'market' }),
          }),
        }),
      }),
    );

    jest.useRealTimers();
  });

  it('renders the error state when the organizations query fails', () => {
    mockUseQuery.mockReturnValue({
      data: {
        readOrganizations: [],
      },
      loading: false,
      error: new Error('nope'),
      refetch: mockRefetch,
      fetchMore: mockFetchMore,
    });

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    expect(screen.getByText('Unable to load organizations right now.')).toBeTruthy();
  });

  it('shows a validation toast when creating without a name', async () => {
    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Create organization' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(readLastToastMessage()).toBe('Organization name is required.');
    });
    expect(mockCreateOrganization).not.toHaveBeenCalled();
  });

  it('creates a new organization with the current admin as owner', async () => {
    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Create organization' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'New Org' } });
    fireEvent.change(within(dialog).getByLabelText('Billing email'), { target: { value: 'new@org.test' } });
    fireEvent.change(within(dialog).getByLabelText('Tags'), { target: { value: 'community, market' } });
    fireEvent.change(within(dialog).getByLabelText('Allowed domains'), { target: { value: 'org.test, gatherle.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith({
        variables: {
          input: {
            ownerId: 'user-1',
            name: 'New Org',
            description: null,
            billingEmail: 'new@org.test',
            tags: ['community', 'market'],
            domainsAllowed: ['org.test', 'gatherle.com'],
            defaultVisibility: 'Public',
          },
        },
      });
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows a toast when organization creation fails', async () => {
    mockCreateOrganization.mockRejectedValueOnce(new Error('create failed'));

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Create organization' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Broken Org' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(readLastToastMessage()).toBe('Unable to create this organization.');
    });
  });

  it('saves organization edits through the edit dialog', async () => {
    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Market Org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save organization' }));

    await waitFor(() => {
      expect(mockUpdateOrganization).toHaveBeenCalledWith({
        variables: {
          input: {
            orgId: 'org-1',
            name: 'Updated Market Org',
            description: 'A local market collective.',
            billingEmail: 'hello@market.org',
            tags: ['community'],
            domainsAllowed: ['market.org'],
            defaultVisibility: 'Public',
          },
        },
      });
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows a toast when saving organization edits fails', async () => {
    mockUpdateOrganization.mockRejectedValueOnce(new Error('update failed'));

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Broken Market Org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save organization' }));

    await waitFor(() => {
      expect(readLastToastMessage()).toBe('Unable to update this organization.');
    });
  });

  it('deletes an organization from the confirmation flow', async () => {
    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }));

    await waitFor(() => {
      expect(mockDeleteOrganization).toHaveBeenCalledWith({
        variables: {
          orgId: 'org-1',
        },
      });
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows a toast when organization deletion fails', async () => {
    mockDeleteOrganization.mockRejectedValueOnce(new Error('delete failed'));

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete organization' }));

    await waitFor(() => {
      expect(readLastToastMessage()).toBe('Unable to delete this organization.');
    });
  });

  it('opens the members dialog for a selected organization', () => {
    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Members' }));

    expect(screen.getByText('Members for Market Org')).toBeTruthy();
  });

  it('shows a toast when loading more organizations fails', async () => {
    mockFetchMore.mockRejectedValueOnce(new Error('load more failed'));
    mockUseQuery.mockReturnValue({
      data: {
        readOrganizations: Array.from({ length: 12 }, (_, index) => buildOrganization(index + 1)),
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
      fetchMore: mockFetchMore,
    });

    render(<AdminOrganizationsSection token="token" currentUserId="user-1" />);

    await act(async () => {
      await (infiniteScrollConfig?.onEndReached as (() => Promise<void>) | undefined)?.();
    });

    await waitFor(() => {
      expect(readLastToastMessage()).toBe('Unable to load more organizations.');
    });
  });
});
