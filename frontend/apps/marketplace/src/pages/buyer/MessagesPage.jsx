import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Search, Send } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export function MessagesPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/messages').then(setConversations).catch(requestError => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (conversationId) api(`/messages/${conversationId}`).then(setMessages).catch(requestError => setError(requestError.message));
    else setMessages([]);
  }, [conversationId]);

  const send = async event => {
    event.preventDefault();
    const content = event.currentTarget.message.value.trim();
    if (!content || !conversationId) return;
    const created = await api(`/messages/${conversationId}`, { method: 'POST', body: JSON.stringify({ content }) });
    setMessages(current => [...current, created]);
    event.currentTarget.reset();
  };

  const activeConversation = conversations.find(item => item.id === conversationId);
  const activeParticipant = activeConversation?.participants?.[0] || {};

  return (
    <div className="market-page buyer-messages-page">
      <div className="commerce-page-heading">
        <span className="market-kicker">BUYSELL CHAT</span>
        <h1>Messages</h1>
        <p>Keep product questions, seller conversations and order context inside the marketplace.</p>
      </div>

      <div className="buyer-messages-shell">
        <aside className="buyer-conversation-sidebar">
          <div className="conversation-search"><Search size={16} /><input placeholder="Search conversations" /></div>
          <div className="buyer-conversation-list">
            {conversations.length ? conversations.map(conversation => {
              const participant = conversation.participants?.[0] || {};
              const name = participant.store_name || participant.name || 'Marketplace conversation';
              return (
                <Link key={conversation.id} className={conversationId === conversation.id ? 'buyer-conversation active' : 'buyer-conversation'} to={`/messages/${conversation.id}`}>
                  <span className="conversation-avatar">{name.slice(0, 2).toUpperCase()}</span>
                  <span className="conversation-copy"><strong>{name}</strong><small>{conversation.last_message?.content || conversation.last_message?.message || 'Start the conversation'}</small></span>
                  {conversation.unread_count > 0 && <b>{conversation.unread_count}</b>}
                </Link>
              );
            }) : <div className="buyer-message-empty"><MessageCircle size={24} /><span>No conversations yet.</span></div>}
          </div>
        </aside>

        <section className="buyer-chat-panel">
          {error && <p className="error">{error}</p>}
          {conversationId ? (
            <>
              <header className="buyer-chat-header">
                <span className="conversation-avatar">{(activeParticipant.store_name || activeParticipant.name || 'BS').slice(0, 2).toUpperCase()}</span>
                <div><strong>{activeParticipant.store_name || activeParticipant.name || 'BUYSELL conversation'}</strong><small>Messages stay linked to your marketplace account.</small></div>
              </header>
              <div className="buyer-chat-messages">
                {messages.length ? messages.map(message => (
                  <div key={message.id} className={message.sender_id === user.id ? 'buyer-bubble mine' : 'buyer-bubble'}>
                    <p>{message.content || message.message || message.body}</p>
                    <small>{message.created_at ? new Date(message.created_at).toLocaleString('en-NG') : ''}</small>
                  </div>
                )) : <div className="buyer-chat-start"><MessageCircle size={26} /><strong>Start the conversation</strong><span>Ask about the product, stock, delivery or order details.</span></div>}
              </div>
              <form className="buyer-message-form" onSubmit={send}>
                <input name="message" placeholder="Write a message…" autoComplete="off" />
                <button><Send size={17} /><span>Send</span></button>
              </form>
            </>
          ) : (
            <div className="buyer-chat-start large"><MessageCircle size={31} /><strong>Select a conversation</strong><span>Your BUYSELL messages will appear here.</span></div>
          )}
        </section>
      </div>
    </div>
  );
}
