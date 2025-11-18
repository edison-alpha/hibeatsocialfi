import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]:`, networkError);
    console.error(`[Network error] Operation:`, operation.operationName);
  }
});

// HTTP link to Somnia subgraph endpoint (v4.5.0 - Complete NFT metadata from contract)
// Note: Social features (likes, comments, follows) use Datastream (EAS), not this subgraph
const SUBGRAPH_ENDPOINT = 'https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.5.0/gn';

console.log('🔗 [Apollo] Initializing with endpoint:', SUBGRAPH_ENDPOINT);

const httpLink = new HttpLink({
  uri: SUBGRAPH_ENDPOINT,
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          posts: {
            // Merge pagination results
            keyArgs: ['where', 'orderBy', 'orderDirection'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
