import { create_path, flatten_path, line_to, move_to } from "squander/core/runtime";

const path = create_path([move_to(0, 0), line_to(80, 20)]);
const flattened = flatten_path(path.get_commands(), 0.25);
void flattened;
