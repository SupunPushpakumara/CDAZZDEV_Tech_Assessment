import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'TeamSync App Development', description: 'The name of the project' })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name!: string;

  @ApiProperty({
    example: 'Build mobile companion and next.js dashboard applications.',
    description: 'The description of the project',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['user-uuid-1', 'user-uuid-2'],
    description: 'The IDs of the members to add to the project',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberIds?: string[];
}
