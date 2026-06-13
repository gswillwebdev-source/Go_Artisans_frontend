import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Modal, FlatList, TextInput,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, Radius, Spacing } from '../theme';

const CHAT_API = 'https://goartisans.online/api/chat';
const CHAT_HISTORY_API = 'https://goartisans.online/api/chat-history';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export default function ChatAssistant() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
    const [sessionId] = useState(() => Math.random().toString(36).substring(2));
    const flatListRef = useRef<FlatList>(null);

    // Bounce animation for the 3 dots
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isLoading) {
            const makeBounce = (anim: Animated.Value, delay: number) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
                        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
                        Animated.delay(200),
                    ])
                );
            const a1 = makeBounce(dot1, 0);
            const a2 = makeBounce(dot2, 150);
            const a3 = makeBounce(dot3, 300);
            a1.start(); a2.start(); a3.start();
            return () => { a1.stop(); a2.stop(); a3.stop(); };
        } else {
            dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
        }
    }, [isLoading]);

    useEffect(() => {
        if (isOpen && user?.id && messages.length === 0) {
            loadHistory();
        }
    }, [isOpen]);

    async function loadHistory() {
        try {
            const res = await fetch(`${CHAT_HISTORY_API}?userId=${user?.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.messages?.length) {
                    const loaded: ChatMessage[] = [];
                    for (const m of data.messages) {
                        loaded.push({ role: 'user', content: m.message, timestamp: m.created_at });
                        loaded.push({ role: 'assistant', content: m.response, timestamp: m.created_at });
                    }
                    setMessages(loaded);
                }
            }
        } catch { /* ignore */ }
    }

    async function sendMessage() {
        const text = input.trim();
        if (!text || isLoading) return;
        setInput('');

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const res = await fetch(CHAT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, userId: user?.id ?? null, sessionId }),
            });
            const data = await res.json();
            const reply = data.response || data.message || 'Sorry, no response.';
            setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }]);
            if (data.rateLimitRemaining != null) setRateLimitRemaining(data.rateLimitRemaining);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred. Please try again.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    return (
        <>
            {/* Floating button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setIsOpen(true)}
                activeOpacity={0.85}
            >
                <Ionicons name={isOpen ? 'close' : 'chatbubble-ellipses'} size={26} color="#fff" />
            </TouchableOpacity>

            {/* Chat modal */}
            <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
                <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.chatContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.headerTitle}>How can we help?</Text>
                                <Text style={styles.headerSub}>GoArtisans Support</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Messages */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(_, i) => String(i)}
                            style={styles.messageList}
                            contentContainerStyle={styles.messageListContent}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyEmoji}>👋</Text>
                                    <Text style={styles.emptyText}>Hello! Ask me anything about GoArtisans</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
                                    <View style={[styles.msgBubble, item.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleBot]}>
                                        <Text style={[styles.msgText, item.role === 'user' ? styles.msgTextUser : styles.msgTextBot]}>
                                            {item.content}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        />

                        {/* Loading dots */}
                        {isLoading && (
                            <View style={styles.loadingRow}>
                                <View style={styles.loadingBubble}>
                                    <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
                                    <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
                                    <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
                                </View>
                            </View>
                        )}

                        {/* Rate limit warning */}
                        {rateLimitRemaining != null && rateLimitRemaining <= 2 && (
                            <View style={styles.rateLimitBanner}>
                                <Ionicons name="warning-outline" size={14} color="#92400e" />
                                <Text style={styles.rateLimitText}>{rateLimitRemaining} messages remaining today</Text>
                            </View>
                        )}

                        {/* Input */}
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                value={input}
                                onChangeText={setInput}
                                placeholder="Type your question..."
                                placeholderTextColor={Colors.textMuted}
                                onSubmitEditing={sendMessage}
                                returnKeyType="send"
                                editable={!isLoading}
                                multiline={false}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
                                onPress={sendMessage}
                                disabled={!input.trim() || isLoading}
                            >
                                <Ionicons name="send" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const INDIGO = '#4F46E5';
const INDIGO_DARK = '#3730A3';

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: INDIGO,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: INDIGO,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        zIndex: 999,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    chatContainer: {
        backgroundColor: Colors.bgCard,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '75%',
        overflow: 'hidden',
    },
    header: {
        backgroundColor: INDIGO,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: 16,
    },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
    headerSub: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },
    messageList: { flex: 1 },
    messageListContent: { padding: Spacing.lg, gap: 10, flexGrow: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyEmoji: { fontSize: 36, marginBottom: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
    msgRow: { flexDirection: 'row', marginBottom: 6 },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowBot: { justifyContent: 'flex-start' },
    msgBubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
    msgBubbleUser: { backgroundColor: INDIGO, borderBottomRightRadius: 4 },
    msgBubbleBot: { backgroundColor: Colors.bgElevated, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
    msgText: { fontSize: 14, lineHeight: 20 },
    msgTextUser: { color: '#fff' },
    msgTextBot: { color: Colors.textPrimary },
    loadingRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: 8 },
    loadingBubble: {
        flexDirection: 'row', gap: 5, alignItems: 'center',
        backgroundColor: Colors.bgElevated, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: Colors.border,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted },
    rateLimitBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#fef3c7', paddingHorizontal: Spacing.lg, paddingVertical: 8,
        borderTopWidth: 1, borderColor: '#fde68a',
    },
    rateLimitText: { fontSize: 12, color: '#92400e' },
    inputRow: {
        flexDirection: 'row', gap: 10, alignItems: 'center',
        borderTopWidth: 1, borderColor: Colors.border,
        paddingHorizontal: Spacing.lg, paddingVertical: 12,
        backgroundColor: Colors.bg,
    },
    input: {
        flex: 1, backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
        paddingHorizontal: 14, paddingVertical: 10, color: Colors.textPrimary,
        fontSize: 14, borderWidth: 1, borderColor: Colors.border,
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: INDIGO, alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: Colors.textMuted },
});
