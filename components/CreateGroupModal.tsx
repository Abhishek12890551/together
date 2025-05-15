import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../app/contexts/AuthContext";
import { useSocket } from "../app/contexts/SocketContext";

interface Contact {
  _id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isVisible,
  onClose,
  onGroupCreated,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchContacts();
    }
  }, [isVisible]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const fetchContacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/connections/contacts");
      setContacts(response.data.data); // Accessing data property since API returns { success: true, data: [...] }
      setFilteredContacts(response.data.data);
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      setError("Failed to load contacts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContactSelection = (contact: Contact) => {
    if (selectedContacts.some((c) => c._id === contact._id)) {
      setSelectedContacts(
        selectedContacts.filter((c) => c._id !== contact._id)
      );
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const createGroup = async () => {
    if (groupName.trim() === "") {
      setError("Group name is required");
      return;
    }

    if (selectedContacts.length === 0) {
      setError("Please select at least one contact");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await axiosInstance.post("/conversations/group", {
        groupName: groupName.trim(),
        participantIds: selectedContacts.map((contact) => contact._id),
      });
      const newGroup = response.data.data;

      // Join the new conversation room immediately
      if (socket && socket.connected) {
        socket.emit("joinConversation", newGroup._id);

        // Explicitly notify all participants about the new group
        socket.emit("notifyGroupCreation", {
          conversationId: newGroup._id,
          participantIds: selectedContacts.map((c) => c._id),
        });

        // For users who might have missed the server-side broadcast
        selectedContacts.forEach((contact) => {
          // This will help ensure all participants see the new group without refresh
          console.log(`Group created with ${contact.name}`);
        });
      }

      // Reset form values
      setGroupName("");
      setSelectedContacts([]);
      setSearchQuery("");

      // Call onGroupCreated callback to refresh the conversation list
      onGroupCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create group. Please try again."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.some((c) => c._id === item._id);

    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.selectedContact]}
        onPress={() => toggleContactSelection(item)}>
        <View style={styles.contactAvatar}>
          {item.profileImageUrl ? (
            <Image
              source={{ uri: item.profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name.split(" ")[0]}</Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color="#0891b2" />
          ) : (
            <View style={styles.uncheckedCircle} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.groupNameInput}
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#666"
          />

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
          </View>

          {selectedContacts.length > 0 && (
            <View style={styles.selectedContactsContainer}>
              <Text style={styles.selectedContactsTitle}>
                Selected ({selectedContacts.length}):
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedContacts.map((contact) => (
                  <View key={contact._id} style={styles.selectedContactChip}>
                    <Text style={styles.selectedContactName} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleContactSelection(contact)}
                      style={styles.removeContactButton}>
                      <Ionicons name="close-circle" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0891b2" />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item._id}
              style={styles.contactsList}
              contentContainerStyle={styles.contactsListContent}
            />
          )}

          <TouchableOpacity
            style={[
              styles.createButton,
              (isCreating ||
                groupName.trim() === "" ||
                selectedContacts.length === 0) &&
                styles.createButtonDisabled,
            ]}
            onPress={createGroup}
            disabled={
              isCreating ||
              groupName.trim() === "" ||
              selectedContacts.length === 0
            }>
            {isCreating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 4,
    padding: 10,
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
    color: "#333",
  },
  selectedContactsContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  selectedContactsTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  selectedContactChip: {
    backgroundColor: "#0891b2",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: 150,
  },
  selectedContactName: {
    color: "#fff",
    fontSize: 14,
    marginRight: 4,
    flex: 1,
  },
  removeContactButton: {
    marginLeft: 4,
  },
  contactsList: {
    maxHeight: 300,
  },
  contactsListContent: {
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedContact: {
    backgroundColor: "rgba(8, 145, 178, 0.1)",
    borderRadius: 8,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  defaultAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0891b2",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  contactEmail: {
    fontSize: 12,
    color: "#666",
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  createButton: {
    backgroundColor: "#0891b2",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default CreateGroupModal;
