import React from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const modules = {
  toolbar: [
    [
      {
        header: [
          1,
          2,
          3,
          false,
        ],
      },
    ],
    ["bold", "italic", "underline"],
    [
      {
        list: "ordered",
      },
      {
        list: "bullet",
      },
    ],
    ["link"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "link",
];

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
}) => {
  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={
          placeholder || ""
        }
      />
    </div>
  );
};

export default RichTextEditor;