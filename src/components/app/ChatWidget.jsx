import { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Modal, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send, Bot, User, Mic } from 'lucide-react-native';
import { chatWithSahakarAI } from '@services/aiService';
import { useAuth } from '@context/AuthContext';
import { useLanguage } from '@context/LanguageContext';
import useSpeechToText from '@hooks/useSpeechToText';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * ChatWidget — RN port of the web app's global AiChatWidget (Sahakar AI assistant), backed by
 * the Groq aiService (chatWithSahakarAI). Mounted globally in RootNavigator so it overlays every
 * authenticated portal (customer/worker/admin), matching the web app's always-present widget.
 *
 * PRESERVED FROM WEB:
 *  - message shape { id, role:'user'|'model', text, time }, trilingual welcome seed
 *  - sendMessage builds history = messages.map({role,text}) and calls chatWithSahakarAI(history, role)
 *  - per-role QUICK_PROMPTS shown until the conversation gets going (messages.length < 3)
 *  - unread badge on the FAB when a reply arrives while closed
 *  - typing indicator while awaiting a reply
 *
 * DIVERGENCE FROM WEB (deliberate, both improvements/necessities):
 *  - The floating window becomes a bottom-sheet Modal — the idiomatic RN pattern, and it plays
 *    correctly with the software keyboard via KeyboardAvoidingView (a fixed-position div does not
 *    translate to RN).
 *  - The language selector reflects the app's ACTUAL selected language (useLanguage) rather than
 *    a widget-local EN/HI/BN toggle that the web never even passed to the model. The chip row is
 *    kept as a visible affordance, but tapping a chip sets the app language so it's consistent
 *    with the rest of the UI. The model still infers response language from what the user types
 *    (same as web).
 *  - Voice input (web used browser SpeechRecognition) is a labeled stub here; the real mic lands
 *    in Phase 10b with @react-native-voice/voice.
 */

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'HI' },
  { code: 'bn', label: 'বাংলা', short: 'BN' },
];

const QUICK_PROMPTS = {
  customer: [
    'How do I book a service?',
    'AC filter kab saaf karein?',
    'আমার বিল কত হবে?',
    'Track my booking',
  ],
  worker: [
    'My weekly hour limit?',
    'Overtime bonus kaise milega?',
    'আমার বীমা কখন শুরু হবে?',
    'Apply for emergency leave',
  ],
  admin: ['Demand forecast today', 'Understaffed zones', 'Complaint status'],
};

const WELCOME = {
  id: 1,
  role: 'model',
  text: "नमस्ते! 🙏 Hello! আমি Sahakar AI। আপনার সেবায় আছি! I'm here to help in English, हिन्दी, or বাংলা.",
  time: new Date(),
};

function formatTime(d) {
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatWidget() {
  const { role } = useAuth();
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef(null);

  const activeLang = LANGUAGES.find((l) => l.code === (language || 'en')) || LANGUAGES[0];

  // Voice input (Phase 10b) — recognized text is appended to the chat input box.
  const stt = useSpeechToText({
    language,
    onFinalResult: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
  });

  useEffect(() => {
    if (open) {
      setUnread(0);
      // Defer so the new content is laid out before we scroll.
      const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(t);
    }
  }, [open, messages]);

  const sendMessage = async (preset) => {
    const raw = (preset ?? input).trim();
    if (!raw || loading) return;

    const userMsg = { id: Date.now(), role: 'user', text: raw, time: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const history = newMessages.map((m) => ({ role: m.role, text: m.text }));
    const { text } = await chatWithSahakarAI(history, role || 'customer');
    setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'model', text, time: new Date() }]);
    setLoading(false);
    if (!open) setUnread((u) => u + 1);
  };

  const quickPrompts = QUICK_PROMPTS[role] || QUICK_PROMPTS.customer;

  return (
    <>
      {/* Floating action button (always visible while authenticated) */}
      <Pressable
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 78 }, pressed && styles.fabPressed]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Open Sahakar AI assistant"
      >
        <Bot size={24} color={colors.white} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}
          >
            <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <View style={styles.avatar}>
                    <Bot size={18} color={colors.white} />
                    <View style={styles.onlineDot} />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Sahakar AI</Text>
                    <Text style={styles.headerSub}>Always online • 3 languages</Text>
                  </View>
                </View>
                <View style={styles.headerRight}>
                  <View style={styles.langRow}>
                    {LANGUAGES.map((lang) => {
                      const active = activeLang.code === lang.code;
                      return (
                        <Pressable
                          key={lang.code}
                          style={[styles.langBtn, active && styles.langBtnActive]}
                          onPress={() => setLanguage(lang.code)}
                          accessibilityLabel={lang.label}
                        >
                          <Text style={[styles.langText, active && styles.langTextActive]}>{lang.short}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable style={styles.closeBtn} onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel="Close chat">
                    <X size={20} color={colors.white} />
                  </Pressable>
                </View>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={styles.messages}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <View key={msg.id} style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
                      {!isUser && (
                        <View style={styles.msgAvatar}>
                          <Bot size={14} color={colors.primary700} />
                        </View>
                      )}
                      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.text}</Text>
                        <Text style={[styles.time, isUser && styles.timeUser]}>{formatTime(msg.time)}</Text>
                      </View>
                      {isUser && (
                        <View style={[styles.msgAvatar, styles.msgAvatarUser]}>
                          <User size={14} color={colors.accent700} />
                        </View>
                      )}
                    </View>
                  );
                })}

                {loading && (
                  <View style={[styles.msgRow, styles.msgRowBot]}>
                    <View style={styles.msgAvatar}>
                      <Bot size={14} color={colors.primary700} />
                    </View>
                    <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                      <ActivityIndicator size="small" color={colors.primary500} />
                      <Text style={styles.typingText}>Sahakar AI is typing…</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick prompts (only early in the conversation) */}
              {messages.length < 3 && (
                <View style={styles.quickWrap}>
                  {quickPrompts.map((p) => (
                    <Pressable key={p} style={styles.quickBtn} onPress={() => setInput(p)}>
                      <Text style={styles.quickText}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Input row */}
              <View style={styles.inputRow}>
                <Pressable
                  style={[styles.voiceBtn, stt.listening && styles.voiceBtnActive]}
                  onPress={() => (stt.listening ? stt.stop() : stt.start())}
                  accessibilityLabel={stt.listening ? 'Listening — tap to stop' : 'Voice input'}
                >
                  <Mic size={16} color={stt.listening ? colors.white : colors.gray500} />
                </Pressable>
                <TextInput
                  style={styles.input}
                  placeholder={stt.listening ? 'Listening…' : `Type in ${activeLang.label}…`}
                  placeholderTextColor={colors.gray400}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => sendMessage()}
                  returnKeyType="send"
                  multiline
                />
                <Pressable
                  style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                  onPress={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  accessibilityLabel="Send message"
                >
                  <Send size={16} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.space4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shadowXl,
    zIndex: 1000,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.danger500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheetWrap: { maxHeight: '86%' },
  sheet: {
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.radius2xl,
    borderTopRightRadius: radii.radius2xl,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space4,
    backgroundColor: colors.primary600,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.success500, borderWidth: 2, borderColor: colors.white,
  },
  headerTitle: { color: colors.white, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interRegular },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  langRow: { flexDirection: 'row', gap: 4 },
  langBtn: {
    paddingVertical: 3, paddingHorizontal: 7, borderRadius: radii.radiusSm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  langBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: colors.white },
  langText: { color: colors.white, fontSize: 10, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, opacity: 0.85 },
  langTextActive: { opacity: 1 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  messages: { maxHeight: 420 },
  messagesContent: { padding: spacing.space4, gap: spacing.space3 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.space2, maxWidth: '90%' },
  msgRowBot: { alignSelf: 'flex-start' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary100,
    alignItems: 'center', justifyContent: 'center',
  },
  msgAvatarUser: { backgroundColor: colors.accent100 },
  bubble: { paddingVertical: spacing.space2, paddingHorizontal: spacing.space3, borderRadius: 16, flexShrink: 1 },
  bubbleBot: { backgroundColor: colors.white, borderBottomLeftRadius: 4, ...shadows.shadowSm },
  bubbleUser: { backgroundColor: colors.primary600, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: fontSizes.fsSm, lineHeight: 21, color: colors.gray800, fontFamily: fontFamilies.interRegular },
  bubbleTextUser: { color: colors.white },
  time: { fontSize: 10, color: colors.gray400, marginTop: 4, fontFamily: fontFamilies.interRegular },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  typingText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  quickWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: spacing.space4, paddingVertical: spacing.space2,
    borderTopWidth: 1, borderTopColor: colors.gray100, backgroundColor: colors.white,
  },
  quickBtn: {
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: radii.radiusFull,
    borderWidth: 1, borderColor: colors.primary200, backgroundColor: colors.primary50,
  },
  quickText: { fontSize: fontSizes.fsXs, color: colors.primary700, fontFamily: fontFamilies.interMedium },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space2,
    padding: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100, backgroundColor: colors.white,
  },
  voiceBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: colors.danger500, borderColor: colors.danger500,
  },
  input: {
    flex: 1, maxHeight: 96,
    paddingVertical: spacing.space2, paddingHorizontal: spacing.space3,
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radii.radius2xl,
    fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray900,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary600,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
