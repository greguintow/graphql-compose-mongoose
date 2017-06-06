/* @flow */

import { Resolver, TypeComposer, graphql } from 'graphql-compose';
import GraphQLMongoID from '../types/mongoid';
import { limitHelperArgs, limitHelper } from './helpers/limit';
import { sortHelperArgs, sortHelper } from './helpers/sort';
import { projectionHelper } from './helpers/projection';
import type { MongooseModelT, ExtendedResolveParams, GenResolverOpts } from '../definition';

const { GraphQLNonNull, GraphQLList } = graphql;

export default function findByIds(
  model: MongooseModelT,
  typeComposer: TypeComposer,
  opts?: GenResolverOpts
): Resolver<*, *> {
  if (!model || !model.modelName || !model.schema) {
    throw new Error('First arg for Resolver findByIds() should be instance of Mongoose Model.');
  }

  if (!(typeComposer instanceof TypeComposer)) {
    throw new Error('Second arg for Resolver findByIds() should be instance of TypeComposer.');
  }

  return new Resolver({
    type: [typeComposer],
    name: 'findByIds',
    kind: 'query',
    args: {
      _ids: {
        name: '_ids',
        type: new GraphQLNonNull(new GraphQLList(GraphQLMongoID)),
      },
      ...limitHelperArgs({
        ...(opts && opts.limit),
      }),
      ...sortHelperArgs(model, {
        sortTypeName: `SortFindByIds${typeComposer.getTypeName()}Input`,
        ...(opts && opts.sort),
      }),
    },
    resolve: (resolveParams: ExtendedResolveParams) => {
      const args = resolveParams.args || {};

      if (!Array.isArray(args._ids)) {
        return Promise.resolve([]);
      }

      const selector = {
        _id: { $in: args._ids },
      };

      resolveParams.query = model.find(selector); // eslint-disable-line
      projectionHelper(resolveParams);
      limitHelper(resolveParams);
      sortHelper(resolveParams);
      return resolveParams.query.exec();
    },
  });
}
