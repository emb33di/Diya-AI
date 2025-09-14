/**
 * Real-time Synchronization Service
 * 
 * This service handles real-time collaboration and comment synchronization
 * like Google Docs, using WebSockets and Operational Transform.
 */

import { GoogleDocsCommentService, DocumentOperation, CollaborativeSession } from './googleDocsCommentService';

export interface RealtimeOperation {
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  length: number;
  text?: string;
  timestamp: number;
  clientId: string;
  operationId: string;
}

export interface RealtimeComment {
  id: string;
  threadId: string;
  position: { start: number; end: number };
  text: string;
  type: 'comment' | 'suggestion' | 'question';
  resolved: boolean;
  participants: string[];
}

export interface RealtimeCursor {
  userId: string;
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
  color: string;
  name: string;
}

export interface RealtimePresence {
  userId: string;
  userName: string;
  userAvatar?: string;
  cursor?: RealtimeCursor;
  lastSeen: number;
}

/**
 * Real-time Synchronization Service
 * Handles WebSocket connections and real-time updates
 */
export class RealtimeSyncService {
  private ws: WebSocket | null = null;
  private essayId: string | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private pendingOperations: RealtimeOperation[] = [];
  private operationBuffer: Map<string, RealtimeOperation> = new Map();

  // Event handlers
  private onOperation?: (operation: RealtimeOperation) => void;
  private onComment?: (comment: RealtimeComment) => void;
  private onPresence?: (presence: RealtimePresence[]) => void;
  private onCursor?: (cursor: RealtimeCursor) => void;
  private onError?: (error: Error) => void;
  private onConnect?: () => void;
  private onDisconnect?: () => void;

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Connect to real-time sync for an essay
   */
  async connect(essayId: string): Promise<void> {
    try {
      this.essayId = essayId;
      
      // Create collaborative session
      await GoogleDocsCommentService.createCollaborativeSession(
        essayId,
        this.clientId,
        navigator.userAgent,
        await this.getClientIP()
      );

      // Connect to WebSocket
      await this.connectWebSocket();

      // Send any pending operations
      await this.flushPendingOperations();

    } catch (error) {
      console.error('Error connecting to real-time sync:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Disconnect from real-time sync
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.onDisconnect?.();
  }

  /**
   * Send operation to other clients
   */
  async sendOperation(operation: Omit<RealtimeOperation, 'clientId' | 'operationId' | 'timestamp'>): Promise<void> {
    try {
      const realtimeOperation: RealtimeOperation = {
        ...operation,
        clientId: this.clientId,
        operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };

      // Store in buffer for conflict resolution
      this.operationBuffer.set(realtimeOperation.operationId, realtimeOperation);

      // Apply operation locally first
      await this.applyOperationLocally(realtimeOperation);

      // Send to server
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'operation',
          essayId: this.essayId,
          operation: realtimeOperation
        }));
      } else {
        // Queue for later
        this.pendingOperations.push(realtimeOperation);
      }

    } catch (error) {
      console.error('Error sending operation:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Send comment update
   */
  async sendComment(comment: RealtimeComment): Promise<void> {
    try {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'comment',
          essayId: this.essayId,
          comment
        }));
      }
    } catch (error) {
      console.error('Error sending comment:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Send cursor position update
   */
  async sendCursor(cursor: RealtimeCursor): Promise<void> {
    try {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'cursor',
          essayId: this.essayId,
          cursor
        }));
      }
    } catch (error) {
      console.error('Error sending cursor:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: {
    onOperation?: (operation: RealtimeOperation) => void;
    onComment?: (comment: RealtimeComment) => void;
    onPresence?: (presence: RealtimePresence[]) => void;
    onCursor?: (cursor: RealtimeCursor) => void;
    onError?: (error: Error) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }): void {
    this.onOperation = handlers.onOperation;
    this.onComment = handlers.onComment;
    this.onPresence = handlers.onPresence;
    this.onCursor = handlers.onCursor;
    this.onError = handlers.onError;
    this.onConnect = handlers.onConnect;
    this.onDisconnect = handlers.onDisconnect;
  }

  /**
   * Connect to WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.getWebSocketUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.onDisconnect?.();
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onError?.(new Error('WebSocket connection failed'));
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'operation':
          this.handleRemoteOperation(message.operation);
          break;

        case 'comment':
          this.handleRemoteComment(message.comment);
          break;

        case 'presence':
          this.handleRemotePresence(message.presence);
          break;

        case 'cursor':
          this.handleRemoteCursor(message.cursor);
          break;

        case 'error':
          this.onError?.(new Error(message.error));
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Handle remote operation from other clients
   */
  private async handleRemoteOperation(operation: RealtimeOperation): Promise<void> {
    try {
      // Don't process our own operations
      if (operation.clientId === this.clientId) {
        return;
      }

      // Transform operation against our local operations
      const transformedOperation = await this.transformOperation(operation);

      // Apply transformed operation
      await this.applyOperationLocally(transformedOperation);

      // Notify listeners
      this.onOperation?.(transformedOperation);

    } catch (error) {
      console.error('Error handling remote operation:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Handle remote comment updates
   */
  private handleRemoteComment(comment: RealtimeComment): void {
    this.onComment?.(comment);
  }

  /**
   * Handle remote presence updates
   */
  private handleRemotePresence(presence: RealtimePresence[]): void {
    this.onPresence?.(presence);
  }

  /**
   * Handle remote cursor updates
   */
  private handleRemoteCursor(cursor: RealtimeCursor): void {
    this.onCursor?.(cursor);
  }

  /**
   * Apply operation locally
   */
  private async applyOperationLocally(operation: RealtimeOperation): Promise<void> {
    try {
      // Convert to DocumentOperation format
      const documentOperation: Omit<DocumentOperation, 'id' | 'documentVersion' | 'operationVersion'> = {
        essayId: this.essayId!,
        userId: '', // Will be filled by service
        operationType: operation.type,
        position: operation.position,
        length: operation.length,
        textContent: operation.text,
        operationId: operation.operationId,
        timestamp: operation.timestamp,
        clientId: operation.clientId,
        applied: true,
        transformed: false
      };

      // Apply through Google Docs service
      await GoogleDocsCommentService.applyOperation(this.essayId!, documentOperation);

    } catch (error) {
      console.error('Error applying operation locally:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Transform operation using OT algorithm
   */
  private async transformOperation(
    incomingOperation: RealtimeOperation
  ): Promise<RealtimeOperation> {
    try {
      // Get all local operations that happened after the incoming operation's timestamp
      const localOperations = Array.from(this.operationBuffer.values())
        .filter(op => op.timestamp > incomingOperation.timestamp)
        .sort((a, b) => a.timestamp - b.timestamp);

      let transformedOperation = { ...incomingOperation };

      // Apply OT algorithm to each local operation
      for (const localOp of localOperations) {
        transformedOperation = this.transformOperationPair(transformedOperation, localOp);
      }

      return transformedOperation;

    } catch (error) {
      console.error('Error transforming operation:', error);
      return incomingOperation; // Fallback to original
    }
  }

  /**
   * Transform two operations against each other
   */
  private transformOperationPair(
    op1: RealtimeOperation,
    op2: RealtimeOperation
  ): RealtimeOperation {
    // Simplified OT algorithm - in production, this would be more complex
    let transformedOp1 = { ...op1 };

    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        transformedOp1.position += op2.length;
      }
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        transformedOp1.position -= Math.min(op2.length, op1.position - op2.position);
      }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        transformedOp1.position += op2.length;
      }
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        transformedOp1.position -= Math.min(op2.length, op1.position - op2.position);
      }
    }

    return transformedOp1;
  }

  /**
   * Flush pending operations
   */
  private async flushPendingOperations(): Promise<void> {
    for (const operation of this.pendingOperations) {
      await this.sendOperation(operation);
    }
    this.pendingOperations = [];
  }

  /**
   * Handle reconnection
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectWebSocket().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.onError?.(new Error('Connection lost and reconnection failed'));
    }
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/realtime`;
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not get client IP:', error);
      return 'unknown';
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    clientId: string;
    essayId: string | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      clientId: this.clientId,
      essayId: this.essayId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

/**
 * Real-time Comment Manager
 * High-level interface for managing comments in real-time
 */
export class RealtimeCommentManager {
  private syncService: RealtimeSyncService;
  private essayId: string;

  constructor(essayId: string) {
    this.essayId = essayId;
    this.syncService = new RealtimeSyncService();
  }

  /**
   * Initialize real-time comment system
   */
  async initialize(): Promise<void> {
    await this.syncService.connect(this.essayId);
    
    this.syncService.setEventHandlers({
      onOperation: this.handleOperation.bind(this),
      onComment: this.handleComment.bind(this),
      onPresence: this.handlePresence.bind(this),
      onCursor: this.handleCursor.bind(this),
      onError: this.handleError.bind(this),
      onConnect: this.handleConnect.bind(this),
      onDisconnect: this.handleDisconnect.bind(this)
    });
  }

  /**
   * Create comment in real-time
   */
  async createComment(commentData: {
    position: { start: number; end: number };
    text: string;
    type: 'comment' | 'suggestion' | 'question';
  }): Promise<void> {
    const comment: RealtimeComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: commentData.position,
      text: commentData.text,
      type: commentData.type,
      resolved: false,
      participants: []
    };

    await this.syncService.sendComment(comment);
  }

  /**
   * Update cursor position
   */
  async updateCursor(position: number, selectionStart?: number, selectionEnd?: number): Promise<void> {
    const cursor: RealtimeCursor = {
      userId: 'current_user', // Would be actual user ID
      position,
      selectionStart,
      selectionEnd,
      color: '#3b82f6',
      name: 'You'
    };

    await this.syncService.sendCursor(cursor);
  }

  /**
   * Handle operation events
   */
  private handleOperation(operation: RealtimeOperation): void {
    console.log('Operation received:', operation);
    // Update UI with operation
  }

  /**
   * Handle comment events
   */
  private handleComment(comment: RealtimeComment): void {
    console.log('Comment received:', comment);
    // Update UI with comment
  }

  /**
   * Handle presence events
   */
  private handlePresence(presence: RealtimePresence[]): void {
    console.log('Presence updated:', presence);
    // Update UI with presence indicators
  }

  /**
   * Handle cursor events
   */
  private handleCursor(cursor: RealtimeCursor): void {
    console.log('Cursor received:', cursor);
    // Update UI with remote cursor
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('Real-time error:', error);
    // Show error to user
  }

  /**
   * Handle connection
   */
  private handleConnect(): void {
    console.log('Real-time connected');
    // Update UI connection status
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    console.log('Real-time disconnected');
    // Update UI connection status
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.syncService.disconnect();
  }
}
