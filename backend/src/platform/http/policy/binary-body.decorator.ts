import { SetMetadata } from '@nestjs/common'

export const BINARY_BODY_METADATA = 'http:binary-body'
export const BinaryBody = (): MethodDecorator =>
  SetMetadata(BINARY_BODY_METADATA, true)
