// import { useEffect } from "react";
// import { useLocation, Link as RouterLink } from "react-router-dom";
// import { Box, Typography, Link } from "@mui/material";
 
// const NotFound = () => {
//   const location = useLocation();
 
//   useEffect(() => {
//     console.error("404 Error: User attempted to access non-existent route:", location.pathname);
//   }, [location.pathname]);
 
//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         bgcolor: "background.default",
//       }}
//     >
//       <Box sx={{ textAlign: "center" }}>
//         <Typography variant="h3" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
//           404
//         </Typography>
//         <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
//           Oops! Page not found
//         </Typography>
//         <Link component={RouterLink} to="/" underline="hover" color="primary">
//           Return to Home
//         </Link>
//       </Box>
//     </Box>
//   );
// };
 
// export default NotFound;
import { useEffect } from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { Box, Typography, Link } from "@mui/material";

/**
 * 404 Page Component
 * Shown when user navigates to an invalid route
 */
const NotFound = () => {
  const location = useLocation(); // Gives current URL info

  /**
   * Log error when user hits invalid route
   * Useful for debugging or analytics
   */
  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Box
      sx={{
        minHeight: "100vh", // Full screen height
        display: "flex",
        alignItems: "center", // Center vertically
        justifyContent: "center", // Center horizontally
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        {/* Main error code */}
        <Typography variant="h3" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
          404
        </Typography>

        {/* Message */}
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Oops! Page not found
        </Typography>

        {/* Navigation back to home */}
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          color="primary"
        >
          Return to Home
        </Link>
      </Box>
    </Box>
  );
};

export default NotFound;