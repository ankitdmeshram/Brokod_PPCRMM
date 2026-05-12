import { Box } from "@mui/joy";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Italic,
  Link,
  List,
  Paragraph,
  Strikethrough,
  Underline,
  Undo,
} from "ckeditor5";
import "../../../node_modules/ckeditor5/dist/ckeditor5.css";

const editorConfig = {
  licenseKey: import.meta.env.VITE_CKEDITOR_LICENSE_KEY || "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Link,
    List,
    BlockQuote,
    Undo,
  ],
  toolbar: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "|",
    "link",
    "bulletedList",
    "numberedList",
    "blockQuote",
  ],
};

export default function RichTextEditor({
  value = "",
  placeholder = "",
  minHeight = 180,
  onChange,
}) {
  return (
    <Box
      sx={{
        borderRadius: "12px",
        overflow: "visible",
        border: "1px solid rgba(160, 174, 208, 0.45)",
        backgroundColor: "#fff",
        "& .ck.ck-editor": {
          border: "0",
          borderRadius: "12px",
          overflow: "visible",
          backgroundColor: "#fff",
        },
        "& .ck.ck-editor__top": {
          borderRadius: "12px 12px 0 0",
          overflow: "visible",
        },
        "& .ck.ck-toolbar": {
          border: "0",
          borderBottom: "1px solid rgba(220, 226, 244, 0.95)",
          backgroundColor: "#f8faff",
          borderRadius: "12px 12px 0 0",
          paddingInline: "8px",
        },
        "& .ck.ck-toolbar .ck-toolbar__items": {
          flexWrap: "wrap",
        },
        "& .ck.ck-editor__main": {
          borderRadius: "0 0 12px 12px",
          overflow: "hidden",
          backgroundColor: "#fff",
        },
        "& .ck.ck-content": {
          minHeight,
          border: "0",
          boxShadow: "none",
          color: "var(--color-font-primary)",
          borderRadius: "0 0 12px 12px",
          padding: "14px 16px",
          backgroundColor: "#fff",
        },
        "& .ck.ck-content.ck-focused": {
          border: "0",
          boxShadow: "none",
        },
        "& .ck.ck-editor__main > .ck-editor__editable:not(.ck-focused)": {
          border: "0",
        },
        "& .ck.ck-button, & .ck.ck-button.ck-on": {
          borderRadius: "8px",
        },
        "& .ck.ck-dropdown__panel": {
          zIndex: 1400,
        },
      }}
    >
      <CKEditor
        editor={ClassicEditor}
        config={{
          ...editorConfig,
          placeholder,
        }}
        data={value || ""}
        onChange={(_, editor) => {
          onChange?.(editor.getData());
        }}
      />
    </Box>
  );
}
