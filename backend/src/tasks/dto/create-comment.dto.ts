import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'This is a comment indicating progress on the task.', description: 'The comment body' })
  @IsString()
  @IsNotEmpty({ message: 'Comment body cannot be empty' })
  body!: string;
}
