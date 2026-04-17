 
import React from "react";
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useTheme, alpha } from "@mui/material/styles";
import { useThemeMode } from "../context/ThemeModeContext";
 
const DRAWER_W = 320;
 
const SettingsDrawer = ({ open, onClose }) => {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
 
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: DRAWER_W },
            maxWidth: "100%",
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 16 }}>Settings</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close settings">
          <CloseIcon />
        </IconButton>
      </Box>
 
      <Box sx={{ p: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", letterSpacing: 1, fontSize: 10, display: "block", mb: 1 }}
        >
          Appearance
        </Typography>
        <List disablePadding sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <ListItem
            sx={{
              py: 1.5,
              px: 2,
              pr: 10,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.06 : 0.04),
            }}
            secondaryAction={
              <Switch
                edge="end"
                checked={mode === "dark"}
                onChange={(_, checked) => setMode(checked ? "dark" : "light")}
                color="primary"
              />
            }
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <DarkModeOutlinedIcon sx={{ color: "text.secondary", fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText
              primary="Dark theme"
              secondary="Use dark colors across the app"
              primaryTypographyProps={{ fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 12 }}
            />
          </ListItem>
        </List>
      </Box>
 
      <Divider sx={{ mt: "auto" }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          More preferences can be added here later.
        </Typography>
      </Box>
    </Drawer>
  );
};
 
export default SettingsDrawer;
 
