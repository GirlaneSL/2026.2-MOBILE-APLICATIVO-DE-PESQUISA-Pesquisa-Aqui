import { PartialType } from "@nestjs/mapped-types";
import { CreateResearchDto } from "./create-research.dto.js";

export class UpdateResearchDto extends PartialType(CreateResearchDto) { }