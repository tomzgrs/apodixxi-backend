import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL || ''}/api`;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIAssistantProps {
  deviceId: string;
  onClose?: () => void;
}

export default function AIAssistant({ deviceId, onClose }: AIAssistantProps) {
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load chat history
    loadChatHistory();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: 'Γεια σου! Είμαι ο AI βοηθός του apodixxi. Μπορώ να σε βοηθήσω με:\n\n• Ανάλυση εξόδων\n• Συμβουλές εξοικονόμησης\n• Σύγκριση τιμών\n• Προτάσεις αγορών\n\nΤι θα ήθελες να μάθεις;',
        isUser: false,
        timestamp: new Date(),
      }]);
    }
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(`ai_chat_${deviceId}`);
      if (history) {
        const parsed = JSON.parse(history);
        setMessages(parsed.messages || []);
        setSessionId(parsed.sessionId || null);
      }
    } catch (e) {
      console.log('Failed to load chat history');
    }
  };

  const saveChatHistory = async (newMessages: Message[], newSessionId: string | null) => {
    try {
      await AsyncStorage.setItem(`ai_chat_${deviceId}`, JSON.stringify({
        messages: newMessages.slice(-50), // Keep last 50 messages
        sessionId: newSessionId,
      }));
    } catch (e) {
      console.log('Failed to save chat history');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          message: userMessage.text,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('AI service error');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      setSessionId(data.session_id);
      saveChatHistory(updatedMessages, data.session_id);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Συγγνώμη, κάτι πήγε στραβά. Δοκίμασε ξανά.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Ανάλυση εξόδων', query: 'Κάνε μια ανάλυση των εξόδων μου' },
    { label: 'Εξοικονόμηση', query: 'Πώς μπορώ να εξοικονομήσω χρήματα;' },
    { label: 'Προτάσεις', query: 'Τι προϊόντα μου προτείνεις;' },
  ];

  const styles = createStyles(theme, isDark);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Βοηθός</Text>
            <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {!message.isUser && (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </View>
            )}
            <View style={[
              styles.messageContent,
              message.isUser ? styles.userContent : styles.aiContent,
            ]}>
              <Text style={[
                styles.messageText,
                message.isUser ? styles.userText : styles.aiText,
              ]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={14} color="#fff" />
            </View>
            <View style={[styles.messageContent, styles.aiContent]}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickActions}
          contentContainerStyle={styles.quickActionsContent}
        >
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickAction}
              onPress={() => {
                setInputText(action.query);
              }}
            >
              <Text style={styles.quickActionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ρώτησέ με οτιδήποτε..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() && !isLoading ? '#fff' : theme.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  aiBubble: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContent: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userContent: {
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: theme.text,
  },
  quickActions: {
    maxHeight: 50,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  quickActionsContent: {
    padding: 8,
    gap: 8,
  },
  quickAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    marginRight: 8,
  },
  quickActionText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    color: theme.text,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: isDark ? '#333' : '#ddd',
  },
});
