import React, { useState, useEffect } from "react";
import { db } from "./api/firebase"; // Make sure this path is correct
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";

const WebWorkPage = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "", 
    role: "", 
    progress: 0, 
    color: "#00A3FF", 
    profilePic: "" 
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const defaultProfilePic = "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.dreamstime.com%2Fdefault-profile-picture-avatar-photo-placeholder-vector-illustration-default-profile-picture-avatar-photo-placeholder-vector-image189495158&psig=AOvVaw0hC3FpuzDqRObXde3JQ6E1&ust=1742170192853000&source=images&cd=vfe&opi=89978449&ved=0CBEQjRxqFwoTCLjiusyrjYwDFQAAAAAdAAAAABAE";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().empName,
          email: doc.data().empEmail,
          role: doc.data().empRole,
          progress: parseInt(doc.data().empProgress) || 0,
          color: doc.data().empColor || "#00A3FF",
          profilePic: doc.data().empProfilePic || defaultProfilePic,
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
    }
  };

  const uploadProfilePic = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `profilePics/${file.name}_${Date.now()}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.role) return;
  
    setUploading(true);
    try {
      let profilePicURL = defaultProfilePic;
      if (profilePicFile) {
        profilePicURL = await uploadProfilePic(profilePicFile);
      }
  
      const userId = `user_${Date.now()}`;
      const userRef = doc(collection(db, "users"), userId);
  
      await setDoc(userRef, {
        empID: userId,
        empName: newUser.name,
        empEmail: newUser.email,
        empRole: newUser.role,
        empAccessLvl: "Employee",
        empAssigned: 0,
        empFinished: "0",
        empProgress: "0",
        empColor: newUser.color || "#00A3FF",
        empProfilePic: profilePicURL,
      });
  
      setUsers([...users, { id: userId, ...newUser, profilePic: profilePicURL }]);
      setNewUser({ name: "", email: "", role: "", progress: 0, color: "#00A3FF", profilePic: "" });
      setProfilePicFile(null);
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Failed to add user: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const totalProgress = users.reduce((sum, user) => sum + user.progress, 0) / users.length || 0;

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="p-6 min-h-screen text-white" style={{ backgroundColor: "#0a0f1e", fontFamily: "monospace" }}>
      <h2 className="text-2xl mb-4 text-cyan-300 border-b border-cyan-400 pb-2">User Dashboard</h2>

      <button 
        onClick={() => setIsFormOpen(true)} 
        className="mb-4 px-4 py-2 bg-blue-500 rounded shadow-lg hover:bg-blue-600 transition transform hover:scale-105 border border-cyan-400 text-black font-bold"
      >
        + Add User
      </button>

      <div className="relative mb-6 p-4 rounded-lg border border-cyan-500" style={{ backgroundColor: "#122041" }}>
        <h3 className="text-lg mb-2 text-cyan-300">Overall Progress</h3>
        <div className="w-full bg-gray-800 rounded-full h-6 flex relative">
          {users.map((user, index) => (
            <div
              key={index}
              style={{
                width: `${user.progress / users.length}%`,
                backgroundColor: user.color,
                borderRadius: "5px",
              }}
              className="h-6"
            ></div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg border border-cyan-500" style={{ backgroundColor: "#122041" }}>
        <h3 className="text-lg mb-3 text-cyan-300">Current Users</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-cyan-800 text-black">
              <th className="p-2">Profile</th>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Color</th>
              <th className="p-2 w-1/3">Progress</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr 
                key={index} 
                className="border-t border-gray-600 cursor-pointer hover:bg-cyan-900" 
                onClick={() => handleUserClick(user)}
              >
                <td className="p-2">
                  <img src={user.profilePic} alt="Profile" className="w-10 h-10 rounded-full" />
                </td>
                <td className="p-2 text-cyan-200">{user.name}</td>
                <td className="p-2 text-cyan-200">{user.email}</td>
                <td className="p-2 text-cyan-200">{user.role}</td>
                <td className="p-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: user.color }}></div>
                </td>
                <td className="p-2">
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div 
                      className="h-4 rounded-full" 
                      style={{ width: `${user.progress}%`, backgroundColor: user.color }}
                    ></div>
                  </div>
                  <span className="text-sm text-cyan-300">{user.progress}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 rounded-lg border border-cyan-500" style={{ backgroundColor: "#122041" }}>
            <h3 className="text-xl mb-4 text-cyan-300">Add New User</h3>
            <input 
              type="text" 
              name="name" 
              value={newUser.name} 
              onChange={handleChange} 
              placeholder="Name" 
              className="w-full p-2 mb-2 rounded bg-gray-700 text-white"
            />
            <input 
              type="email" 
              name="email" 
              value={newUser.email} 
              onChange={handleChange} 
              placeholder="Email" 
              className="w-full p-2 mb-2 rounded bg-gray-700 text-white"
            />
            <input 
              type="text" 
              name="role" 
              value={newUser.role} 
              onChange={handleChange} 
              placeholder="Role" 
              className="w-full p-2 mb-2 rounded bg-gray-700 text-white"
            />
            <label className="block text-cyan-300 mb-1">Profile Picture:</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
            />
            <div className="flex justify-between">
              <button 
                onClick={addUser} 
                disabled={uploading} 
                className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
              >
                {uploading ? "Uploading..." : "Add"}
              </button>
              <button 
                onClick={() => setIsFormOpen(false)} 
                className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebWorkPage;