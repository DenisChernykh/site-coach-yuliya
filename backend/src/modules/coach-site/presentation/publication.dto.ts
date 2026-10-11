import { ApiProperty } from '@nestjs/swagger'

export class ContentVersionDto {
  @ApiProperty({ type: Number, minimum: 0 }) public readonly revision!: number
}

export class PublicationStatusDto {
  @ApiProperty({ type: Boolean })
  public readonly automaticPublicationEnabled!: boolean
  @ApiProperty({ type: Number }) public readonly requestedRevision!: number
  @ApiProperty({ type: Number }) public readonly deployedRevision!: number
  @ApiProperty({ type: Number, nullable: true })
  public readonly activeRevision!: number | null
  @ApiProperty({
    type: String,
    enum: ['IDLE', 'PENDING', 'DISPATCHING', 'BUILDING', 'FAILED'],
  })
  public readonly status!: string
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  public readonly requestedAt!: Date | null
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  public readonly dispatchedAt!: Date | null
  @ApiProperty({ type: Number }) public readonly attempts!: number
  @ApiProperty({ type: String, format: 'date-time' })
  public readonly nextAttemptAt!: Date
  @ApiProperty({ type: String, nullable: true })
  public readonly workflowRunId!: string | null
  @ApiProperty({ type: String, nullable: true }) public readonly workflowUrl!:
    string | null
  @ApiProperty({ type: String, nullable: true })
  public readonly lastErrorCode!: string | null
}
