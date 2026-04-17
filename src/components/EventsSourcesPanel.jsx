import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Collapse, Chip, Link, Grid } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ProcessingSteps from "./ProcessingSteps";
 
const pillButtonSx = (theme) => ({
  fontSize: 12,
  color: "primary.main",
  textTransform: "none",
  border: "1px solid",
  borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
  borderRadius: "20px",
  px: 2,
  py: 0.35,
  width: "100%",
  justifyContent: "flex-start",
  boxSizing: "border-box",
  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.08) },
});
 
const EventsSourcesPanel = ({
  processingSteps,
  activityLog,
  streamMeta,
  sources,
  citations,
  isLive = false,
  /** When pipeline hits 100% in the “answer streaming” phase, collapse Events (matches inline processing hide). */
  collapseLiveEventsWhenReady = false,
}) => {
  const theme = useTheme();
  const [eventsOpen, setEventsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [histStepSubOpen, setHistStepSubOpen] = useState({});
 
  const prevCollapseRef = useRef(false);
  useEffect(() => {
    if (!isLive) {
      prevCollapseRef.current = false;
      return;
    }
    if (collapseLiveEventsWhenReady && !prevCollapseRef.current) {
      setEventsOpen(false);
    }
    prevCollapseRef.current = collapseLiveEventsWhenReady;
  }, [isLive, collapseLiveEventsWhenReady]);
 
  const hasLiveSteps = Boolean(processingSteps && processingSteps.length > 0);
  const hasEvents =
    hasLiveSteps ||
    (activityLog && activityLog.length > 0) ||
    Boolean(streamMeta?.searchQuery || streamMeta?.foundSummary || (streamMeta?.documents && streamMeta.documents.length > 0));
  const hasSources = sources && sources.length > 0;
 
  if (!hasEvents && !hasSources) return null;
 
  const eventsBodySx = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 2,
    border: "1px solid",
    borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
    bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.04) : "#f8fafc",
    p: 1.5,
    maxHeight: 360,
    overflow: "auto",
    minWidth: 0,
    overflowX: "hidden",
  };
 
  const pillMdSize = hasEvents && hasSources ? 6 : 12;
 
  return (
    <Grid container spacing={1.25} sx={{ mt: 1.5, width: "100%", minWidth: 0, maxWidth: "100%" }}>
      {hasEvents && (
        <Grid size={{ xs: 12, md: pillMdSize }}>
          <Button
            size="small"
            fullWidth
            onClick={() => setEventsOpen(!eventsOpen)}
            startIcon={eventsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={pillButtonSx(theme)}
          >
            Events
          </Button>
        </Grid>
      )}
      {hasSources && (
        <Grid size={{ xs: 12, md: pillMdSize }}>
          <Button
            size="small"
            fullWidth
            onClick={() => setSourcesOpen(!sourcesOpen)}
            startIcon={sourcesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={pillButtonSx(theme)}
          >
            Sources
          </Button>
        </Grid>
      )}
 
      {hasEvents && (
        <Grid size={12}>
          <Collapse in={eventsOpen}>
            <Box sx={eventsBodySx}>
              {isLive && processingSteps && processingSteps.length > 0 ? (
                <ProcessingSteps
                  steps={processingSteps}
                  isLive
                  streamMeta={streamMeta}
                  activityLog={activityLog}
                  substepsCollapsible
                />
              ) : null}
 
              {isLive && (!processingSteps || processingSteps.length === 0) && streamMeta?.searchQuery && (
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.06) : "#ffffff",
                    border: "1px solid",
                    borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>Q</Typography>
                    <Typography sx={{ fontSize: 12, color: "text.primary", wordBreak: "break-word" }}>
                      {streamMeta.searchQuery}
                    </Typography>
                  </Box>
                </Box>
              )}
 
              {!isLive && streamMeta?.searchQuery && (
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.06) : "#ffffff",
                    border: "1px solid",
                    borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>Q</Typography>
                    <Typography sx={{ fontSize: 12, color: "text.primary", wordBreak: "break-word" }}>
                      {streamMeta.searchQuery}
                    </Typography>
                  </Box>
                  {streamMeta.foundSummary && (
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.75 }}>
                      {streamMeta.foundSummary}
                    </Typography>
                  )}
                  {streamMeta.documents && streamMeta.documents.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
                      {streamMeta.documents.map((name) => (
                        <Chip
                          key={name}
                          size="small"
                          icon={<DescriptionOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                          label={name}
                          sx={{
                            height: 26,
                            bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.08) : "#eef2f6",
                            border: "1px solid",
                            borderColor: "divider",
                            "& .MuiChip-label": { fontSize: 11 },
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
 
              {!isLive &&
                processingSteps?.map((step) => (
                  <Box key={step.id} sx={{ mb: 1.25 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                      <Typography sx={{ fontSize: 13, color: "success.main", fontWeight: 700, mt: -0.25 }}>✓</Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.primary" }}>{step.label}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{step.description}</Typography>
                        {Array.isArray(step.substeps) && step.substeps.length > 0 && (
                          <>
                            <Button
                              size="small"
                              onClick={() => setHistStepSubOpen((o) => ({ ...o, [step.id]: !o[step.id] }))}
                              sx={{ mt: 0.5, textTransform: "none", fontSize: 11, px: 0.75, minHeight: 28 }}
                            >
                              {histStepSubOpen[step.id] ? "Hide" : "Show"} substeps ({step.substeps.length})
                            </Button>
                            <Collapse in={Boolean(histStepSubOpen[step.id])}>
                              <Box sx={{ mt: 0.35, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
                                {step.substeps.map((line, si) => (
                                  <Typography key={`${step.id}-ev-${si}`} sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.45 }}>
                                    {line}
                                  </Typography>
                                ))}
                              </Box>
                            </Collapse>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
 
              {!isLive && activityLog && activityLog.length > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed", borderColor: "divider" }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary", mb: 0.5 }}>
                    Activity
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 160, overflow: "auto", fontSize: 11.5, color: "text.secondary" }}>
                    {activityLog.map((line, i) => (
                      <Box component="li" key={`${i}-${line.slice(0, 20)}`} sx={{ mb: 0.35 }}>
                        {line}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </Grid>
      )}
 
      {hasSources && (
        <Grid size={12}>
          <Collapse in={sourcesOpen}>
            <Box sx={{ ...eventsBodySx, maxHeight: 360 }}>
              {sources.map((src, i) => {
                const cite = citations?.find((c) => c.source === src.name || src.name.includes(c.source));
                return (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      gap: 1,
                      p: 1.5,
                      mb: 1,
                      border: "1px solid",
                      borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
                      borderRadius: "10px",
                      bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.04) : "#ffffff",
                    }}
                  >
                    {cite && (
                      <Chip
                        label={cite.index}
                        size="small"
                        sx={{
                          height: 22,
                          minWidth: 22,
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          color: "primary.main",
                        }}
                      />
                    )}
                    <DescriptionOutlinedIcon sx={{ fontSize: 20, color: "text.secondary", mt: 0.2, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                        <Link
                          href={src.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          sx={{ fontSize: 12.5, fontWeight: 600, color: "primary.main" }}
                        >
                          {src.name}
                        </Link>
                        {src.url && <OpenInNewIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
                      </Box>
                      {src.url && (
                        <Typography
                          component="a"
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            fontSize: 11,
                            color: "primary.main",
                            display: "block",
                            mt: 0.35,
                            wordBreak: "break-all",
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {src.url}
                        </Typography>
                      )}
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          color: "text.secondary",
                          mt: 0.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {src.snippet}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
 
              {citations && citations.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", mb: 0.5 }}>
                    Citations
                  </Typography>
                  {citations.map((c) => (
                    <Box key={c.index} sx={{ display: "flex", gap: 0.75, mb: 0.5, alignItems: "flex-start" }}>
                      <Chip
                        label={c.index}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          minWidth: 20,
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          color: "primary.main",
                          fontWeight: 700,
                        }}
                      />
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary", flex: 1 }}>
                        {c.text} —{" "}
                        <Box component="span" sx={{ color: "primary.main", fontStyle: "italic" }}>
                          {c.source}
                        </Box>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </Grid>
      )}
    </Grid>
  );
};
 
export default EventsSourcesPanel;
