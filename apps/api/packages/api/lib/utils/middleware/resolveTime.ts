import {NextFn, ResolverData} from 'type-graphql';
import {HTTP_METHOD_COLOR_MAP, RESOLVE_TIME_COLOR_MAP, GRAPHQL_API_PATH, ANSI_COLOR_CODES} from '@/constants';
import {getStatusCodeColor} from '@/utils';
import {ServerContext} from '@/server';

// TODO make it work with AWS Lambda
export const ResolveTime = async ({context, info}: ResolverData<ServerContext>, next: NextFn) => {
    const start = Date.now();
    await next();
    const resolveTime = Date.now() - start;

    const resolveTimeColor = RESOLVE_TIME_COLOR_MAP.find((color) => resolveTime <= color.threshold)?.color!;

    const httpMethod = context.req?.method ?? 'UNKNOWN HTTP METHOD';
    const httpMethodColor = HTTP_METHOD_COLOR_MAP[httpMethod] ?? ANSI_COLOR_CODES.GREEN;

    const statusCode = context.res?.statusCode || 200;
    const statusCodeColor = getStatusCodeColor(statusCode);

    const baseUrl = context.req?.baseUrl ?? GRAPHQL_API_PATH;

    if (['Query', 'Mutation', 'Subscription'].includes(info.parentType.name)) {
        console.log(
            `${httpMethodColor}${httpMethod} ${ANSI_COLOR_CODES.GRAY}${baseUrl} ${ANSI_COLOR_CODES.BLUE}(${info.parentType.name}.${info.fieldName}) ${statusCodeColor}${statusCode} - ${resolveTimeColor}[${resolveTime} ms]${ANSI_COLOR_CODES.WHITE}`,
        );
    }
};

export default ResolveTime;
