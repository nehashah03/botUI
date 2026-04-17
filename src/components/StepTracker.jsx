import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { formatElapsed } from '../utils/helpers';
 
const STAGES = [
  { key: 'analyzing', label: 'Analyzing Query' },
  { key: 'searching', label: 'Searching Documents' },
  { key: 'extracting', label: 'Extracting Details' },
  { key: 'generating', label: 'Generating Response' },
];
 
const StepTracker = ({ stage, toolName, elapsed }) => {
  const theme = useTheme();
  const stageOrder = STAGES.map(s => s.key);
  const activeIdx = stageOrder.indexOf(stage);
 
  if (stage === 'idle') return null;
 
  return (
    <Box sx={{
      width: 220, height: '100vh', borderLeft: '1px solid', borderColor: 'divider',
      bgcolor: theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha(theme.palette.primary.main, 0.04),
      p: 2, display: 'flex', flexDirection: 'column',
    }}>
      <Typography sx={{ mb: 2, color: 'text.secondary', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>
        Pipeline
      </Typography>
 
      {STAGES.map((s, i) => {
        const isDone = activeIdx > i || stage === 'complete';
        const isActive = s.key === stage;
 
        return (
          <Box key={s.key} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.25 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1.5, minWidth: 20 }}>
              {isDone ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              ) : isActive ? (
                <CircularProgress size={18} thickness={5} sx={{ color: 'primary.main' }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'action.disabled' }} />
              )}
              {i < STAGES.length - 1 && (
                <Box sx={{ width: 1.5, height: 20, bgcolor: isDone ? 'success.main' : 'divider', my: 0.25, borderRadius: 1 }} />
              )}
            </Box>
            <Box sx={{ pt: 0.1 }}>
              <Typography sx={{
                fontWeight: isActive ? 600 : 400, fontSize: 12.5,
                color: isDone ? 'success.main' : isActive ? 'text.primary' : 'text.disabled',
              }}>
                {s.label}
              </Typography>
              {isActive && toolName && (
                <Typography sx={{ color: 'primary.main', fontSize: 10.5 }}>
                  {toolName}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
 
      {stage !== 'complete' && (
        <Box sx={{ mt: 'auto', py: 1, px: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>
            {formatElapsed(elapsed)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
 
export default StepTracker;
 