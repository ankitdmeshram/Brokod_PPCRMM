import { Box } from "@mui/joy";
import { memo } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  CodeBlock,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  Heading,
  Highlight,
  HorizontalLine,
  Italic,
  Link,
  List,
  ListProperties,
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
    Code,
    Link,
    List,
    ListProperties,
    Alignment,
    BlockQuote,
    CodeBlock,
    HorizontalLine,
    FontFamily,
    FontSize,
    FontColor,
    FontBackgroundColor,
    Highlight,
    Undo,
  ],
  heading: {
    options: [
      { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
      { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
      { model: "heading4", view: "h4", title: "Heading 4", class: "ck-heading_heading4" },
    ],
  },
  fontFamily: {
    supportAllValues: true,
  },
  fontSize: {
    options: [10, 12, 14, "default", 18, 20, 24, 28, 32],
    supportAllValues: true,
  },
  fontColor: {
    columns: 6,
  },
  fontBackgroundColor: {
    columns: 6,
  },
  highlight: {
    options: [
      {
        model: "yellowMarker",
        class: "marker-yellow",
        title: "Yellow marker",
        color: "hsl(60, 97%, 73%)",
        type: "marker",
      },
      {
        model: "greenMarker",
        class: "marker-green",
        title: "Green marker",
        color: "hsl(120, 93%, 68%)",
        type: "marker",
      },
      {
        model: "pinkMarker",
        class: "marker-pink",
        title: "Pink marker",
        color: "hsl(345, 96%, 73%)",
        type: "marker",
      },
      {
        model: "blueMarker",
        class: "marker-blue",
        title: "Blue marker",
        color: "hsl(201, 97%, 72%)",
        type: "marker",
      },
    ],
  },
  list: {
    properties: {
      styles: true,
      startIndex: true,
      reversed: true,
    },
  },
  toolbar: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "fontFamily",
    "fontSize",
    "|",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "code",
    "|",
    "fontColor",
    "fontBackgroundColor",
    "highlight",
    "|",
    "link",
    "bulletedList",
    "numberedList",
    "|",
    "alignment",
    "blockQuote",
    "codeBlock",
    "horizontalLine",
  ],
};

function RichTextEditor({
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

export default memo(RichTextEditor, (previousProps, nextProps) => {
  return (
    previousProps.value === nextProps.value &&
    previousProps.placeholder === nextProps.placeholder &&
    previousProps.minHeight === nextProps.minHeight
  );
});
