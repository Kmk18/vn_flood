import { StyleSheet } from 'react-native';
import { Spacing } from './index'; // import from our theme index

export const GlobalStyles = StyleSheet.create({
  // -------------------------
  // Layouts & Containers
  // -------------------------
  container: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.xl,
  },
  screenPadding: {
    paddingHorizontal: Spacing.m,
  },
  
  // -------------------------
  // Headers
  // -------------------------
  headerContainer: {
    paddingHorizontal: Spacing.l,
    paddingTop: 60,
    paddingBottom: Spacing.m,
  },
  headerTitleCenter: {
    textAlign: 'center',
  },
  
  // -------------------------
  // Core Components
  // -------------------------
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    marginVertical: Spacing.s,
  },
  buttonText: {
    textAlign: 'center',
  },
  inputContainer: {
    marginVertical: Spacing.s,
  },
  inputField: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.m,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.m,
    marginVertical: Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // -------------------------
  // Lists
  // -------------------------
  listContainer: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.xl,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // -------------------------
  // Map Screen
  // -------------------------
  mapAbsolute: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLayerControls: {
    position: 'absolute',
    top: 50,
    right: Spacing.m,
  },
  mapControlButton: {
    paddingHorizontal: Spacing.s,
    height: 40,
  },
  mapHelpButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.l,
    right: Spacing.l,
  },
  mapHelpButton: {
    height: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  // -------------------------
  // Chatbot Screen
  // -------------------------
  chatMessageBubble: {
    maxWidth: '85%',
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.m,
  },
  chatBotBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 0,
  },
  chatUserBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  chatSourcesContainer: {
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: 0.5,
    borderTopColor: '#CCC',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: Spacing.s,
    paddingBottom: Spacing.l,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  chatInputWrapper: {
    flex: 1,
    marginRight: Spacing.s,
  },
  chatSendButton: {
    height: 50,
    marginTop: Spacing.m,
  },

  // -------------------------
  // Profile Screen
  // -------------------------
  profileSection: {
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  profileSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLogoutContainer: {
    marginTop: 'auto',
    padding: Spacing.l,
    paddingBottom: Spacing.xl * 2,
  },
});
