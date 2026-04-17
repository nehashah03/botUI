 
import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
 
const TypingIndicator = () => {
  const theme = useTheme();
  return (
  <Box sx={{
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%',
    px: { xs: 2, sm: 3 },
    py: 1.5,
    animation: 'fadeIn 0.2s ease-out',
    '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
  }}>
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      gap: 1.5,
      maxWidth: { xs: '94%', sm: '70%', md: '70%' },
      width: '100%',
      minWidth: 0,
      alignItems: 'flex-start',
      bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
      border: '1px solid',
      borderColor: alpha(theme.palette.primary.main, 0.25),
      borderRadius: '12px',
      px: 1.75,
      py: 1.25,
    }}>
      <Avatar sx={{ width: 28, height: 28, flexShrink: 0, bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.main' }}>
        <SmartToyOutlinedIcon sx={{ fontSize: 16 }} />
      </Avatar>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pt: 0.5, flex: 1, minWidth: 0 }}>
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled',
            animation: 'bounce 1.4s infinite ease-in-out both',
            animationDelay: `${i * 0.16}s`,
            '@keyframes bounce': { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)' } },
          }} />
        ))}
        <Typography sx={{ ml: 1, fontSize: 12, color: 'text.secondary' }}>Thinking...</Typography>
      </Box>
    </Box>
  </Box>
  );
};
 
export default TypingIndicator;