(function()
{
    // The CocoonJS must exist before creating the extension.
    if (!window) throw("The CocoonJS object must exist and be valid before creating any extension object.");
    if (!window.CocoonJS.Multiplayer) throw("The CocoonJS.Multiplayer object must exist and be valid before creating a Game Center extension object.");

	/**
	* @namespace
	* This instance represents the extension object to access GameCenter Multiplayer API.
	* @see CocoonJS.Multiplayer.MultiplayerService
	*/
	CocoonJS.Multiplayer.GameCenter = new CocoonJS.Multiplayer.MultiplayerService("IDTK_SRV_MULTIPLAYER_GAMECENTER", "Multiplayer.GameCenter");
})();