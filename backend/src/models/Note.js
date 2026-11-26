
import mongoose from "mongoose";
import noteSchema from "./schemas/Note.schema.js";

const Note =
  mongoose.models.Note ||
  mongoose.model("Note", noteSchema);

export default Note;
