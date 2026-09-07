import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MAX_FEEDBACK_ITEMS, MAX_FEEDBACK_ITEM_LENGTH } from '../feedback.constants.js';

export class UpdateFeedbackConfigDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_FEEDBACK_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_FEEDBACK_ITEM_LENGTH, { each: true })
  @IsOptional()
  items?: string[];

  @IsBoolean()
  @IsOptional()
  open?: boolean;
}
