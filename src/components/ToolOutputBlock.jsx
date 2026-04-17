import React, { useState } from "react";
import { Box, Typography, Collapse, IconButton } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TerminalIcon from "@mui/icons-material/Terminal";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
 
const ToolOutputBlock = ({ output }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);
  return (
    <Box sx={{ my: 1, borderRadius: "10px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 0.75,
          cursor: "pointer",
          bgcolor: alpha(theme.palette.success.main, isDark ? 0.12 : 0.08),
          "&:hover": { bgcolor: alpha(theme.palette.success.main, isDark ? 0.18 : 0.12) },
        }}
      >
        <TerminalIcon sx={{ fontSize: 14, color: "success.main", mr: 1 }} />
        <Typography sx={{ fontFamily: "monospace", fontSize: 11.5, color: "success.main", mr: 1 }}>{output.name}</Typography>
        <Typography sx={{ flex: 1, fontSize: 11, color: "text.secondary" }}>Tool Output</Typography>
        {expanded ? <ExpandLessIcon sx={{ fontSize: 16, color: "text.secondary" }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: isDark ? alpha("#fff", 0.04) : "grey.50", maxHeight: 200, overflow: "auto" }}>
          {output.type === "code" ? (
            <SyntaxHighlighter
              language="json"
              style={isDark ? oneDark : oneLight}
              customStyle={{ margin: 0, fontSize: "0.75rem", background: "transparent" }}
            >
              {output.content}
            </SyntaxHighlighter>
          ) : (
            <Typography sx={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", color: "text.secondary" }}>{output.content}</Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
 
export default ToolOutputBlock;