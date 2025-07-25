import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { COLORS } from "../app/types";

interface Document {
  id: number;
  title: string;
  date: string;
  thumbnail: string;
  isLarge?: boolean;
  path: string;
}

interface DocumentOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  document: Document | null;
  onDocumentChange?: (updated: Document | null, deleted?: boolean) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const DocumentOptionsModal: React.FC<DocumentOptionsModalProps> = ({
  visible,
  onClose,
  document,
  onDocumentChange,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [docState, setDocState] = useState<Document | null>(document);

  // Update rename input and docState when document changes
  React.useEffect(() => {
    if (document) {
      let name = document.title;
      name = name.replace(/^IMG[_-]?/i, "");
      AsyncStorage.getItem("DEFAULT_FILE_PREFIX").then(prefix => {
        if (prefix && name.startsWith(prefix)) {
          name = name.slice(prefix.length);
        }
        setRenameValue(name);
      });
      setDocState(document);
    }
  }, [document]);

  // Get file size for details
  React.useEffect(() => {
    if (docState?.path) {
      import("expo-file-system").then(FileSystem => {
        FileSystem.getInfoAsync(docState.path).then(info => {
          if (info.exists && info.size) {
            const kb = info.size / 1024;
            setFileSize(kb > 1024 ? `${(kb/1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`);
          } else {
            setFileSize(null);
          }
        });
      });
    }
  }, [docState]);

  if (!docState) return null;

  // --- Feature Handlers ---
  const handleShare = async () => {
    try {
      await Sharing.shareAsync(docState.path);
    } catch (err) {
      alert("Failed to share PDF");
    }
    // Do not close modal
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    let saved = await AsyncStorage.getItem("SAVED_PDFS");
    let pdfs = saved ? JSON.parse(saved) : [];
    const idx = pdfs.findIndex((pdf: any) => pdf.path === docState.path);
    if (idx !== -1) {
      let prefix = await AsyncStorage.getItem("DEFAULT_FILE_PREFIX");
      prefix = prefix || "IMG";
      const newName = `${prefix}${renameValue.trim()}`;
      pdfs[idx].name = newName;
      await AsyncStorage.setItem("SAVED_PDFS", JSON.stringify(pdfs));
      // Update local state and notify parent
      const updatedDoc = { ...docState, title: newName };
      setDocState(updatedDoc);
      if (onDocumentChange) onDocumentChange(updatedDoc);
    }
    setIsRenaming(false);
    // Do not close modal
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ uri: docState.path });
    } catch (err) {
      alert("Failed to print PDF");
    }
    // Do not close modal
  };

  const handleDelete = async () => {
    let saved = await AsyncStorage.getItem("SAVED_PDFS");
    let pdfs = saved ? JSON.parse(saved) : [];
    pdfs = pdfs.filter((pdf: any) => pdf.path !== docState.path);
    await AsyncStorage.setItem("SAVED_PDFS", JSON.stringify(pdfs));
    if (onDocumentChange) onDocumentChange(null, true);
    onClose();
  };

  // --- Menu Items ---
  const menuItems = [
    {
      icon: "document-text-outline",
      label: "Export PDF",
      action: handleShare,
    },
    {
      icon: "pencil-outline",
      label: "Rename",
      action: () => setIsRenaming(true),
    },
    {
      icon: "print-outline",
      label: "Print",
      action: handlePrint,
    },
    {
      icon: "trash-outline",
      label: "Delete",
      action: handleDelete,
    },
  ];

  // --- UI ---
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          {/* Gray top bar */}
          <View style={styles.topBar} />

          {/* Top: Actual image and file name */}
          <View style={styles.fileInfo}>
            <Image
              source={{ uri: docState.thumbnail }}
              style={styles.smallThumbnail}
            />
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{docState.title}</Text>
            </View>
          </View>

          {/* Menu Items */}
          {!isRenaming && (
            <ScrollView>
              <View style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.menuItem}
                    onPress={item.action}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={"#333333"}
                      style={styles.menuIcon}
                    />
                    <Text style={styles.menuText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
                {/* View Details as last option */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setDetailsExpanded((v) => !v)}
                >
                  <Ionicons
                    name={detailsExpanded ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={"#333333"}
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* View Details (expandable) */}
          {detailsExpanded && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsItem}><Text style={styles.detailsLabel}>File type:</Text> PDF</Text>
              <Text style={styles.detailsItem}><Text style={styles.detailsLabel}>File name:</Text> {docState.title}</Text>
              <Text style={styles.detailsItem}><Text style={styles.detailsLabel}>File size:</Text> {fileSize || "-"}</Text>
              <Text style={styles.detailsItem}><Text style={styles.detailsLabel}>File location:</Text> {docState.path || "-"}</Text>
              <Text style={styles.detailsItem}><Text style={styles.detailsLabel}>Date of capture:</Text> {docState.date || "-"}</Text>
            </View>
          )}

          {/* Rename UI */}
          {isRenaming && (
            <View style={styles.renameSection}>
              <Text style={styles.renameLabel}>Rename file</Text>
              <View style={styles.renameInputRow}>
                <Text style={styles.renamePrefix}>IMG</Text>
                <TextInput
                  value={renameValue}
                  onChangeText={setRenameValue}
                  style={styles.renameInput}
                  autoFocus
                  selectTextOnFocus
                />
              </View>
              <View style={styles.renameActions}>
                <TouchableOpacity onPress={() => setIsRenaming(false)} style={styles.renameCancelBtn}>
                  <Text style={styles.renameCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRename} style={styles.renameSaveBtn}>
                  <Text style={styles.renameSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * (2 / 3), // 2/3 of screen height
    paddingBottom: 34, // Safe area padding for bottom
  },
  topBar: {
    height: 5,
    backgroundColor: "#666",
    marginHorizontal: screenWidth * 0.4,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 3,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2a2a2a",
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  smallThumbnail: {
    width: 40,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 14,
    color: "#999",
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
  },
  menuText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  plusIcon: {
    marginLeft: 8,
  },
  detailsToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2a2a2a",
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  detailsToggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailsItem: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 4,
  },
  detailsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  renameSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  renameLabel: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
  renameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  renamePrefix: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  renameInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    paddingVertical: 0,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  renameCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: COLORS.button,
    borderRadius: 8,
  },
  renameCancelText: {
    fontSize: 14,
    color: "#fff",
  },
  renameSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: COLORS.buttonActive,
    borderRadius: 8,
  },
  renameSaveText: {
    fontSize: 14,
    color: "#fff",
  },
});

export default DocumentOptionsModal;
