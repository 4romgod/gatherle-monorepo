export const getInvalidQuery = () => {
  return {
    query: `mutation SomeInvalidQuery($input: input) {
            someInvalidQuery(input: input) {
                someId
            }
        }`,
    variables: {},
  };
};
