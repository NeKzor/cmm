"Resource/UI/portalleaderboard.res"
{
	"PortalLeaderboard"
	{
		"ControlName"		"Frame"
		"fieldName"			"PortalLeaderboard"
		"xpos"				"0"
		"ypos"				"0"
		"wide"				"10"
		"tall"				"5"
		"autoResize"		"0"
		"visible"			"1"
		"enabled"			"1"
		"tabPosition"		"0"
		"dialogstyle"		"1"
		"statHeight"		"36"
	}

	"PortalChallengeStatsPanel"
	{
		"ControlName"			"CPortalChallengeStatsPanel"
		"fieldName"			"PortalChallengeStatsPanel"
		"xpos"				"400"
		"ypos"				"-50"
		"zpos"				"100"
		"wide"				"100"
		"tall"				"45"
		"bgcolor_override"		"0 0 0 180"
		"visible"			"1"
		"enabled"			"1"
	}

	"ListBtnChapters"
	{
		"ControlName"		"CDialogListButton"
		"fieldName"			"ListBtnChapters"
		"xpos"				"0"
		"ypos"				"10"
		"zpos"				"1"
		"wide"				"250"
		"tall"				"20"
		"visible"			"1"
		"enabled"			"1"
		"tabPosition"		"0"
		//"navUp"				"SldBrightness"
		//"navDown"			"DrpResolution"
		//"labelText"			"#GameUI_AspectRatio"
		//"style"				"DialogListButton"
		"list_number"		"1"
		"?online"
		{
			"list_number"	"2"
		}
		

		"list1"
		{
			"#SP_PRESENCE_TEXT_CH1"		"SelectedChapter:1"
			"#SP_PRESENCE_TEXT_CH2"		"SelectedChapter:2"
			"#SP_PRESENCE_TEXT_CH3"		"SelectedChapter:3"
			"#SP_PRESENCE_TEXT_CH4"		"SelectedChapter:4"
			"#SP_PRESENCE_TEXT_CH5"		"SelectedChapter:5"
			"#SP_PRESENCE_TEXT_CH6"		"SelectedChapter:6"
			"#SP_PRESENCE_TEXT_CH7"		"SelectedChapter:7"
			"#SP_PRESENCE_TEXT_CH8"		"SelectedChapter:8"
			"#SP_PRESENCE_TEXT_CH9"		"SelectedChapter:9"
		}

		"list2"
		{
			"#COOP_PRESENCE_TRACK_TRACK1"		"SelectedChapter:1"
			"#COOP_PRESENCE_TRACK_TRACK2"		"SelectedChapter:2"
			"#COOP_PRESENCE_TRACK_TRACK3"		"SelectedChapter:3"
			"#COOP_PRESENCE_TRACK_TRACK4"		"SelectedChapter:4"
			"#COOP_PRESENCE_TRACK_TRACK5"		"SelectedChapter:5"
			"#COOP_PRESENCE_TRACK_TRACK6"		"SelectedChapter:6"
		}
		
	}

	"ListBtnLeaderboards"
	{
		"ControlName"		"CDialogListButton"
		"fieldName"			"ListBtnLeaderboards"
		"xpos"				"250"
		"ypos"				"100"
		"zpos"				"1"
		"wide"				"250"
		"tall"				"20"
		"visible"			"1"
		"enabled"			"1"
		"tabPosition"		"0"
		"font"				"NewGameChapterName"
		//"navUp"				"SldBrightness"
		//"navDown"			"DrpResolution"
		//"labelText"			"#GameUI_AspectRatio"
		//"style"				"DialogListButton"
		"list"
		{
			"#PORTAL2_Leaderboard_Portals"		"Leaderboard_Portals"
			"#PORTAL2_Leaderboard_Time"			"Leaderboard_Time"
		}
	}

	"LblInvalidLeaderboard"
	{
		"ControlName"			"Label"
		"fieldName"				"LblInvalidLeaderboard"
		"xpos"					"275"
		"ypos"					"50"
		"wide"					"200"
		"tall"					"100"
		"wrap"					"1"
		"visible"				"0"
		"enabled"				"1"
		"tabPosition"			"0"
		"Font"					"DialogMenuItem"
		"labelText"				""
		"textAlignment"			"center"
		"fgcolor_override"		"0 0 0 255"
		"bgcolor_override"		"0 0 0 0"
		"noshortcutsyntax"		"1"
	}

	"LblInvalidLeaderboard2"
	{
		"ControlName"			"Label"
		"fieldName"				"LblInvalidLeaderboard2"
		"xpos"					"275"
		"ypos"					"150"
		"wide"					"200"
		"tall"					"100"
		"wrap"					"1"
		"visible"				"0"
		"enabled"				"1"
		"tabPosition"			"0"
		"Font"					"DialogMenuItem"
		"labelText"				"#L4D360UI_Lobby_Leaderboards_Generic_Required"
		"textAlignment"			"center"
		"fgcolor_override"		"0 0 0 255"
		"bgcolor_override"		"0 0 0 0"
		"noshortcutsyntax"		"1"
	}

	"WorkingAnim"
	{
		"ControlName"					"ImagePanel"
		"fieldName"						"WorkingAnim"
		"xpos"							"325"
		"ypos"							"75"
		"zpos"							"999"
		"wide"							"100"
		"tall"							"100"
		"visible"						"0"
		"enabled"						"1"
		"tabPosition"					"0"
		"scaleImage"					"1"
		"image"							"spinner"
	}

	"MapList"
	{
		"ControlName"					"GenericPanelList"
		"fieldName"						"MapList"
		"xpos"							"0"
		"ypos"							"50"
		"zpos"							"1"
		"wide"							"250"
		"tall"							"200"
		"visible"						"1"
		"enabled"						"1"
		"tabPosition"					"0"
		"NoWrap"						"1"
		"panelBorder"					"0"
	}

	"StatList"
	{
		"ControlName"					"GenericPanelList"
		"fieldName"						"StatList"
		"xpos"							"260"
		"ypos"							"10"
		"zpos"							"1"
		"wide"							"225"
		"tall"							"250"
		"visible"						"1"
		"enabled"						"1"
		"tabPosition"					"0"
		"NoWrap"						"1"
		"panelBorder"					"2"
	}

	"PortalGraph"
	{
		"ControlName"		"CPortalLeaderboardGraphPanel"
		"fieldName"			"PortalGraph"
		"xpos"				"253"
		"ypos"				"73"
		"zpos"				"2"
		"wide"				"244"
		"tall"				"77"
		"pinCorner"			"0"
		"visible"			"1"
		"enabled"			"1"
		"x_offset"				"0"
		"y_offset"				"0"
		"text_x_offset"			"3"
		"text_y_offset"			"1"
		"bgcolor_override"	"255 255 255 0"
	}

	"TimeGraph"
	{
		"ControlName"		"CPortalLeaderboardGraphPanel"
		"fieldName"			"TimeGraph"
		"xpos"				"253"
		"ypos"				"73"
		"zpos"				"2"
		"wide"				"244"
		"tall"				"77"
		"pinCorner"			"0"
		"visible"			"0"
		"enabled"			"1"
		"x_offset"				"0"
		"y_offset"				"0"
		"text_x_offset"			"3"
		"text_y_offset"			"1"
		"bgcolor_override"	"255 255 255 0"
	}

	"LblEveryone"
	{
		"ControlName"			"Label"
		"fieldName"				"LblEveryone"
		"xpos"					"253"
		"ypos"					"3"
		"wide"					"240"
		"tall"					"20"
		"visible"				"1"
		"enabled"				"1"
		"tabPosition"			"0"
		"Font"					"DialogMenuItem"
		"labelText"				"#PORTAL2_Challenge_Community_Stats"
		"textAlignment"			"east"
		"fgcolor_override"		"0 0 0 255"
		"bgcolor_override"		"0 0 0 0"
		"noshortcutsyntax"		"1"
	}
}
