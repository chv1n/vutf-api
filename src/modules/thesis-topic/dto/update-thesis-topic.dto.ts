import { PartialType } from '@nestjs/mapped-types';
import { CreateThesisTopicDto } from './create-thesis-topic.dto';

export class UpdateThesisTopicDto extends PartialType(CreateThesisTopicDto) {}
