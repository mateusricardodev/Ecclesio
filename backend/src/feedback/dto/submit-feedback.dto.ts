import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_FEEDBACK_ITEMS, MAX_FEEDBACK_ITEM_LENGTH } from '../feedback.constants.js';

export class FeedbackRatingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_FEEDBACK_ITEM_LENGTH)
  item: string;

  /** Ausente quando o participante escolhe "não sei avaliar"; não entra na média. */
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}

export class SubmitFeedbackDto {
  /** Enviado pelo link individual do e-mail; ausente no link público genérico. */
  @IsUUID()
  @IsOptional()
  registrationId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  respondentName?: string;

  @IsArray()
  @ArrayMaxSize(MAX_FEEDBACK_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => FeedbackRatingDto)
  ratings: FeedbackRatingDto[];

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  improvements?: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  negatives?: string;
}
