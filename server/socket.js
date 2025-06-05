// Singleton pattern for accessing Socket.io instance from any controller
let io;

// Initialize the Socket.io instance
const init = (socketIo) => {
  io = socketIo;
  console.log('Socket.io instance initialized in socket.js module');
};

// Export the functions
module.exports = {
  init,
  // Getter for io instance
  get io() {
    return io;
  }
}; 