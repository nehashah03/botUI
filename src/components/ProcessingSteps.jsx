
import React, { useState, useCallback } from "react";
import { Box, Typography, CircularProgress, Chip, Button, Collapse } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
 
/**
 * Live pipeline steps with search pill, doc chips, substeps, and activity lines folded under the active step.
 */
const ProcessingSteps = ({ steps, isLive, streamMeta, activityLog, substepsCollapsible = false }) => {
  const theme = useTheme();
  const [subOpen, setSubOpen] = useState({});
  const toggleSub = useCallback((id) => {
    setSubOpen((o) => ({ ...o, [id]: !o[id] }));
  }, []);
  if (!steps || steps.length === 0) return null;
 
  const showSearchPill = streamMeta?.searchQuery && steps.some((s) => s.id === "step-2" && (s.status === "active" || s.status === "complete"));
 
  return (
    <Box sx={{ my: isLive ? 0 : 1.5, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      {steps.map((step) => (
        <Box key={step.id} sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
          <Box sx={{ mr: 1.5, mt: 0.25, minWidth: 22, display: "flex", justifyContent: "center" }}>
            {step.status === "complete" ? (
              <CheckCircleIcon sx={{ fontSize: 20, color: "success.main" }} />
            ) : step.status === "active" ? (
              <CircularProgress size={18} thickness={5} sx={{ color: "primary.main" }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: "action.disabled" }} />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: step.status === "active" ? 600 : 500,
                color: step.status === "complete" ? "text.primary" : step.status === "active" ? "text.primary" : "text.disabled",
              }}
            >
              {step.label}
            </Typography>
            {(step.status === "active" || step.status === "complete") && (
              <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.15 }}>
                {step.description}
              </Typography>
            )}
 
            {Array.isArray(step.substeps) &&
              step.substeps.length > 0 &&
              (step.status === "active" || step.status === "complete") && (
                <>
                  {substepsCollapsible && (
                    <Button
                      size="small"
                      onClick={() => toggleSub(step.id)}
                      sx={{ mt: 0.5, mb: 0.25, textTransform: "none", fontSize: 11, px: 0.75, minHeight: 28 }}
                    >
                      {subOpen[step.id] ? "Hide" : "Show"} substeps ({step.substeps.length})
                    </Button>
                  )}
                  <Collapse in={!substepsCollapsible || subOpen[step.id]} timeout="auto" unmountOnExit={false}>
                    <Box sx={{ mt: substepsCollapsible ? 0 : 0.75, pl: 0.5, borderLeft: "2px solid", borderLeftColor: "primary.main" }}>
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.55,
                          color: "text.secondary",
                          textTransform: "uppercase",
                          mb: 0.35,
                        }}
                      >
                        Live revealing
                      </Typography>
                      {step.substeps.map((line, si) => (
                        <Typography
                          key={`${step.id}-sub-${si}`}
                          sx={{
                            fontSize: 11,
                            color: si === step.substeps.length - 1 && step.status === "active" ? "text.primary" : "text.secondary",
                            fontWeight: si === step.substeps.length - 1 && step.status === "active" ? 500 : 400,
                            lineHeight: 1.45,
                            mb: 0.2,
                          }}
                        >
                          {line}
                        </Typography>
                      ))}
                    </Box>
                  </Collapse>
                </>
              )}
 
            {step.status === "active" && activityLog && activityLog.length > 0 && (
              <Box
                sx={{
                  mt: 0.75,
                  pl: 0.75,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                  fontSize: 10.5,
                  color: "text.secondary",
                  lineHeight: 1.45,
                }}
              >
                {activityLog.map((line, i) => (
                  <Box key={`${i}-${line.slice(0, 24)}`} sx={{ mb: 0.2 }}>
                    <Box component="span" sx={{ color: "success.main", mr: 0.5 }}>
                      ›
                    </Box>
                    {line}
                  </Box>
                ))}
              </Box>
            )}
 
            {step.id === "step-2" && showSearchPill && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.06) : alpha(theme.palette.text.primary, 0.04),
                  border: "1px solid",
                  borderColor: theme.palette.mode === "dark" ? "divider" : "#D5D9D9",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>Q</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.primary", wordBreak: "break-word" }}>
                    {streamMeta.searchQuery}
                  </Typography>
                </Box>
                {streamMeta?.foundSummary && (
                  <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.75 }}>
                    {streamMeta.foundSummary}
                  </Typography>
                )}
                {streamMeta?.documents && streamMeta.documents.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
                    {streamMeta.documents.map((name) => (
                      <Chip
                        key={name}
                        size="small"
                        icon={<DescriptionOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                        label={name}
                        sx={{
                          maxWidth: "100%",
                          height: 28,
                          bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.08) : "#f1f5f9",
                          border: "1px solid",
                          borderColor: "divider",
                          "& .MuiChip-label": { fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
 
export default ProcessingSteps;
 