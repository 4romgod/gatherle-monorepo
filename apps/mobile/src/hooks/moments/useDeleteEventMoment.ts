import { useMutation } from '@apollo/client';
import { DeleteEventMomentDocument } from '@data/graphql/mutation/EventMoment/mutation';
import { getApolloAuthContext } from '@/lib/auth';

export function useDeleteEventMoment(authToken: string | null) {
  const [deleteMomentMutation, state] = useMutation(DeleteEventMomentDocument, getApolloAuthContext(authToken));

  const deleteMoment = async (momentId: string) => {
    if (!authToken) {
      throw new Error('You need to be logged in to delete a moment.');
    }

    const result = await deleteMomentMutation({
      variables: { momentId },
    });

    return result.data?.deleteEventMoment ?? false;
  };

  return {
    deleteMoment,
    loading: state.loading,
  };
}
