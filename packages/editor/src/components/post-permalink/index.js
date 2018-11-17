/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { withDispatch, withSelect } from '@wordpress/data';
import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { compose } from '@wordpress/compose';
import { ClipboardButton, Button, ExternalLink } from '@wordpress/components';
import { safeDecodeURI } from '@wordpress/url';

/**
 * Internal Dependencies
 */
import PostPermalinkEditor from './editor.js';
import PostPreviewButton from '../post-preview-button';
import { getWPAdminURL, cleanForSlug } from '../../utils/url';

class PostPermalink extends Component {
	constructor() {
		super( ...arguments );

		this.addVisibilityCheck = this.addVisibilityCheck.bind( this );
		this.onVisibilityChange = this.onVisibilityChange.bind( this );

		this.state = {
			isCopied: false,
			isEditingPermalink: false,
		};
	}

	addVisibilityCheck() {
		window.addEventListener( 'visibilitychange', this.onVisibilityChange );
	}

	onVisibilityChange() {
		const { isEditable, refreshPost } = this.props;
		// If the user just returned after having clicked the "Change Permalinks" button,
		// fetch a new copy of the post from the server, just in case they enabled permalinks.
		if ( ! isEditable && 'visible' === document.visibilityState ) {
			refreshPost();
		}
	}

	componentDidUpdate( prevProps, prevState ) {
		// If we've just stopped editing the permalink, focus on the new permalink.
		if ( prevState.isEditingPermalink && ! this.state.isEditingPermalink ) {
			this.linkElement.focus();
		}
	}

	componentWillUnmount() {
		window.removeEventListener( 'visibilitychange', this.addVisibilityCheck );
	}

	getDisplaySlug() {
		const { currentSlug, currentTitle, isPublished, isSaving, permalinkParts, postID, savedSlug, postTitle } = this.props;

		if ( isPublished ) {
			return currentSlug || savedSlug || cleanForSlug( currentTitle ) || postID;
		}

		let alternateSlug;
		// If there is no saved or edited slug and the titles are the same
		// then there may be a php generated slug available on the current_post.
		// isSaving check is required because the title edit is cleared
		// before the generated_slug value is set from the response.
		if ( postTitle === currentTitle && 'auto-draft' !== permalinkParts.postName && ! isSaving ) {
			alternateSlug = permalinkParts.postName;
		}

		return currentSlug || alternateSlug || savedSlug || cleanForSlug( currentTitle ) || postID;
	}

	render() {
		const { isNew, postLink, isEditable, isPublished, currentSlug, currentTitle, permalinkParts } = this.props;

		if ( isNew || ! postLink ) {
			return null;
		}

		const { isCopied, isEditingPermalink } = this.state;
		const ariaLabel = isCopied ? __( 'Permalink copied' ) : __( 'Copy the permalink' );

		const { prefix, suffix } = permalinkParts;
		const slug = this.getDisplaySlug();
		const samplePermalink = ( isEditable ) ? prefix + slug + suffix : prefix;

		return (
			<div className="editor-post-permalink">
				<ClipboardButton
					className={ classnames( 'editor-post-permalink__copy', { 'is-copied': isCopied } ) }
					text={ samplePermalink }
					label={ ariaLabel }
					onCopy={ () => this.setState( { isCopied: true } ) }
					aria-disabled={ isCopied }
					icon="admin-links"
				/>

				<span className="editor-post-permalink__label">{ __( 'Permalink:' ) }</span>

				{ ! isEditingPermalink && isPublished &&
					<ExternalLink
						className="editor-post-permalink__link"
						href={ ! isPublished ? postLink : samplePermalink }
						target="_blank"
						ref={ ( linkElement ) => this.linkElement = linkElement }
					>
						{ ( currentTitle || currentSlug ) ? safeDecodeURI( samplePermalink ) : postLink }
						&lrm;
					</ExternalLink>
				}

				{ ! isEditingPermalink && ! isPublished &&
					<PostPreviewButton
						isPermalink={ true }
						className="editor-post-permalink__link"
						samplePermalink={ samplePermalink }
						linkElement={ ( linkElement ) => this.linkElement = linkElement }
					/>
				}

				{ isEditingPermalink &&
					<PostPermalinkEditor
						postSlug={ slug }
						onSave={ () => this.setState( { isEditingPermalink: false } ) }
					/>
				}

				{ isEditable && ! isEditingPermalink && ! isNew &&
					<Button
						className="editor-post-permalink__edit"
						isLarge
						onClick={ () => this.setState( { isEditingPermalink: true } ) }
					>
						{ __( 'Edit' ) }
					</Button>
				}

				{ ! isEditable &&
					<Button
						className="editor-post-permalink__change"
						isLarge
						href={ getWPAdminURL( 'options-permalink.php' ) }
						onClick={ this.addVisibilityCheck }
						target="_blank"
					>
						{ __( 'Change Permalinks' ) }
					</Button>
				}
			</div>
		);
	}
}

export default compose( [
	withSelect( ( select ) => {
		const {
			isPermalinkEditable,
			getCurrentPost,
			isCurrentPostPublished,
			isCleanNewPost,
			isSavingPost,
			getAutosaveAttribute,
			getEditedPostAttribute,
			getPermalinkParts,
		} = select( 'core/editor' );

		const { id, link, title, status } = getCurrentPost();

		return {
			isNew: isCleanNewPost(),
			postLink: link,
			isEditable: isPermalinkEditable(),
			isPublished: isCurrentPostPublished(),
			isSaving: isSavingPost(),
			currentSlug: getEditedPostAttribute( 'slug' ),
			permalinkParts: getPermalinkParts(),
			postID: id,
			postStatus: status,
			postTitle: title,
			savedSlug: getAutosaveAttribute( 'generated_slug' ),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const { refreshPost } = dispatch( 'core/editor' );
		return { refreshPost };
	} ),
] )( PostPermalink );
